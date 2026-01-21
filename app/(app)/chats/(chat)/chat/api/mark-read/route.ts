import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const apiUrl = process.env.CHATWOOT_API_URL;
  const accessToken = process.env.CHATWOOT_APP_ACCESS_TOKEN;

  try {
    // Verificar autenticación del usuario
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { conversationId, agentLastSeenAt, workspaceId } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    if (!apiUrl || !accessToken) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing API credentials' },
        { status: 500 }
      );
    }

    // Verificar que el usuario tiene acceso a canales en este workspace
    const { data: userChannels, error: channelsError } = await supabase
      .from('user_chatwoot_channels')
      .select('chatwoot_inbox_id')
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
        { error: 'No tienes canales asociados en este workspace' },
        { status: 403 }
      );
    }

    const accountId = 1;
    const userInboxIds = userChannels.map(ch => ch.chatwoot_inbox_id);

    // Verificar que la conversación pertenece a un inbox del usuario
    const convResponse = await fetch(
      `${apiUrl}/accounts/${accountId}/conversations/${conversationId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': accessToken,
        },
      }
    );

    if (!convResponse.ok) {
      return NextResponse.json(
        { error: 'Conversación no encontrada' },
        { status: 404 }
      );
    }

    const conversation = await convResponse.json();

    if (!userInboxIds.includes(conversation.inbox_id)) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta conversación' },
        { status: 403 }
      );
    }

    // Use current timestamp if not provided
    const timestamp = agentLastSeenAt || Math.floor(Date.now() / 1000);

    console.log('Marking messages as read for conversation:', conversationId, 'timestamp:', timestamp);

    // Mark conversation as read using Chatwoot API
    // According to Chatwoot API docs: POST /api/v1/accounts/{account_id}/conversations/{conversation_id}/update_last_seen
    const response = await fetch(
      `${apiUrl}/accounts/${accountId}/conversations/${conversationId}/update_last_seen`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': accessToken,
        },
        body: JSON.stringify({
          agent_last_seen_at: timestamp,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Chatwoot API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to mark messages as read', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Messages marked as read successfully:', data);
    return NextResponse.json({
      success: true,
      data,
    }, { status: 200 });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}