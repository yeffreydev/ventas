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
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspace_id parameter is required' },
        { status: 400 }
      );
    }

    // Obtener los canales del usuario desde Supabase filtrados por workspace
    const { data: userChannels, error: channelsError } = await supabase
      .from('user_chatwoot_channels')
      .select('chatwoot_inbox_id, chatwoot_account_id, chatwoot_inbox_name, chatwoot_channel_type, is_active')
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

    // Si el usuario no tiene canales, devolver array vacío
    if (!userChannels || userChannels.length === 0) {
      return NextResponse.json({
        success: true,
        inboxes: [],
        message: 'No tienes canales asociados'
      }, { status: 200 });
    }

    // El Account ID correcto es 1 (descubierto mediante pruebas)
    const accountId = 1;
    console.log(`[Chatwoot] Using account ID: ${accountId}`);

    const targetUrl = `${apiUrl}/accounts/${accountId}/inboxes`;
    console.log(`[Chatwoot] Fetching inboxes from: ${targetUrl}`);

    // Obtener todos los inboxes de Chatwoot
    const response = await axios.get(
      targetUrl,
      {
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': CHATWOOT_APP_ACCESS_TOKEN,
        },
      }
    );

    // Filtrar solo los inboxes que pertenecen al usuario
    const userInboxIds = userChannels.map(ch => ch.chatwoot_inbox_id);
    
    // Check if response data has the payload directly or under data.payload
    const inboxesPayload = response.data?.payload || response.data || [];
    
    if (!Array.isArray(inboxesPayload)) {
      console.error('[Chatwoot] Expected inboxes payload to be an array, got:', typeof inboxesPayload);
      return NextResponse.json({
        success: true,
        inboxes: [],
        total: 0
      }, { status: 200 });
    }

    const filteredInboxes = inboxesPayload.filter((inbox: any) =>
      userInboxIds.includes(inbox.id)
    );

    return NextResponse.json({
      success: true,
      inboxes: filteredInboxes,
      total: filteredInboxes.length
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching inboxes:', error);
    
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
          error: `Failed to fetch inboxes: ${errorMessage}`,
          details: error.response?.data,
          api_url: `...${targetUrl.slice(-20)}` // Partial URL for debugging without exposing domain
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