import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const apiUrl = process.env.CHATWOOT_API_URL;
  const accessToken = process.env.CHATWOOT_APP_ACCESS_TOKEN;

  try {
    // Authenticate user
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

    if (!apiUrl || !accessToken) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing API credentials' },
        { status: 500 }
      );
    }

    // Get user's channels from Supabase filtered by workspace
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

    // Get the inbox IDs that belong to this user
    const userInboxIds = userChannels?.map(ch => ch.chatwoot_inbox_id) || [];

    // If user has no channels, return empty array
    if (userInboxIds.length === 0) {
      return NextResponse.json({
        success: true,
        inboxes: [],
        total: 0
      }, { status: 200 });
    }

    const accountId = 1;

    // Get all inboxes from Chatwoot
    const response = await axios.get(
      `${apiUrl}/accounts/${accountId}/inboxes`,
      {
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': accessToken,
        },
      }
    );

    // Filter only WhatsApp inboxes that belong to this user
    const whatsappInboxes = response.data.payload
      .filter((inbox: any) =>
        inbox.channel_type === 'Channel::Whatsapp' &&
        userInboxIds.includes(inbox.id)
      )
      .map((inbox: any) => ({
        id: inbox.id,
        name: inbox.name,
        phone_number: inbox.phone_number,
        provider: inbox.provider,
        webhook_url: inbox.webhook_url,
        callback_webhook_url: inbox.callback_webhook_url,
        provider_config: inbox.provider_config,
      }));

    return NextResponse.json({
      success: true,
      inboxes: whatsappInboxes,
      total: whatsappInboxes.length
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching WhatsApp inboxes:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('Chatwoot API Error Response:', JSON.stringify(error.response?.data, null, 2));
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      const statusCode = error.response?.status || 500;
      
      return NextResponse.json(
        { 
          error: `Failed to fetch WhatsApp inboxes: ${errorMessage}`,
          details: error.response?.data
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