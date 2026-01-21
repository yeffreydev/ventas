import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const CHATWOOT_API_URL = process.env.CHATWOOT_API_URL;
  const CHATWOOT_APP_ACCESS_TOKEN = process.env.CHATWOOT_APP_ACCESS_TOKEN;
  const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID;

  // Helper to normalize the API URL
  const getNormalizedApiUrl = (url: string) => {
    let normalized = url.trim();
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    // Chatwoot API usually requires /api/v1 prefix
    if (!normalized.includes('/api/v1')) {
      normalized = `${normalized}/api/v1`;
    }
    return normalized;
  };
  
  try {
    if (!CHATWOOT_API_URL || !CHATWOOT_APP_ACCESS_TOKEN) {
      console.error('CHATWOOT_API_URL or CHATWOOT_APP_ACCESS_TOKEN is missing');
      return NextResponse.json(
        { error: 'Server configuration error: Missing API credentials' },
        { status: 500 }
      );
    }

    const apiUrl = getNormalizedApiUrl(CHATWOOT_API_URL);

    // Verificar autenticación del usuario
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversation_id');
    const workspaceId = searchParams.get('workspace_id');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 }
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      );
    }

    // Obtener los canales del usuario filtrados por workspace
    const { data: userChannels, error: channelsError } = await supabase
      .from('user_chatwoot_channels')
      .select('chatwoot_inbox_id, chatwoot_account_id')
      .eq('user_id', user.id)
      .eq('workspace_id', workspaceId)
      .eq('is_active', true);

    if (channelsError) {
      console.error('Error fetching user channels:', channelsError);
      return NextResponse.json(
        { error: 'Error al obtener canales del usuario' },
        { status: 500 }
      );
    }

    if (!userChannels || userChannels.length === 0) {
      return NextResponse.json(
        { error: 'No tienes canales asociados' },
        { status: 403 }
      );
    }

    // El Account ID correcto es 1
    const accountId = 1;
    const userInboxIds = userChannels.map(ch => ch.chatwoot_inbox_id);

    console.log(`[Chatwoot] Fetching messages for conversation ${conversationId}, user ${user.id}`);

    // Primero, obtener la conversación para verificar que pertenece a un inbox del usuario
    const convTargetUrl = `${apiUrl}/accounts/${accountId}/conversations/${conversationId}`;
    const convResponse = await axios.get(
      convTargetUrl,
      {
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': CHATWOOT_APP_ACCESS_TOKEN,
        },
      }
    );

    const conversation = convResponse.data;
    
    // Verificar que la conversación pertenece a un inbox del usuario
    if (!userInboxIds.includes(conversation.inbox_id)) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta conversación' },
        { status: 403 }
      );
    }

    // Get messages
    const msgTargetUrl = `${apiUrl}/accounts/${accountId}/conversations/${conversationId}/messages`;
    const response = await axios.get(
      msgTargetUrl,
      {
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': CHATWOOT_APP_ACCESS_TOKEN,
        },
      }
    );

    // Filter payload - Chatwoot returns payload as array directly or inside data?
    // Based on conversations it might be different, but for messages it's usually payload.
    const messagesPayload = response.data?.payload || response.data || [];

    return NextResponse.json({
      success: true,
      messages: messagesPayload,
      meta: response.data.meta,
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching messages:', error);
    
    if (axios.isAxiosError(error)) {
      const targetUrl = CHATWOOT_API_URL ? getNormalizedApiUrl(CHATWOOT_API_URL) : 'unknown';
      const accountIdForLog = error.config?.url || 'unknown';
      console.error(`[Chatwoot] API Error at ${accountIdForLog}`);
      console.error('[Chatwoot] Status:', error.response?.status);
      console.error('[Chatwoot] Response Body:', JSON.stringify(error.response?.data, null, 2));
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      const statusCode = error.response?.status || 500;
      
      return NextResponse.json(
        { 
          error: `Failed to fetch messages: ${errorMessage}`,
          details: error.response?.data,
          api_url: `...${targetUrl.slice(-20)}`
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}