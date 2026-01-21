import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';
import { checkWorkspaceAccess } from '@/app/utils/workspace-checks';

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    let { inboxName, phoneNumber, phoneNumberId, businessAccountId, apiKey, workspace_id } = body;

    // Validate required fields
    if (!inboxName || !phoneNumber || !phoneNumberId || !businessAccountId || !apiKey || !workspace_id) {
      return NextResponse.json(
        { error: 'All fields are required including workspace_id' },
        { status: 400 }
      );
    }

    // Verificar que el usuario tenga acceso al workspace
    const hasAccess = await checkWorkspaceAccess(supabase, workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'No tienes acceso a este workspace' },
        { status: 403 }
      );
    }

    // Limpiar el número de teléfono: remover espacios y agregar + al inicio si no lo tiene
    phoneNumber = phoneNumber.replace(/\s+/g, ''); // Remover todos los espacios
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+' + phoneNumber; // Agregar + al inicio si no lo tiene
    }

    if (!apiUrl || !accessToken) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing API credentials' },
        { status: 500 }
      );
    }

    const accountId = 1;

    // Correct structure for WhatsApp Cloud API
    // No enviamos webhook_verify_token para que Chatwoot lo genere automáticamente
    const requestBody = {
      name: inboxName,
      channel: {
        type: 'whatsapp',
        phone_number: phoneNumber,
        provider: 'whatsapp_cloud',
        provider_config: {
          api_key: apiKey,
          phone_number_id: phoneNumberId,
          business_account_id: businessAccountId,
        }
      }
    };

    console.log('Sending request to Chatwoot:', {
      url: `${apiUrl}/accounts/${accountId}/inboxes`,
      body: requestBody
    });

    const response = await axios.post(
      `${apiUrl}/accounts/${accountId}/inboxes`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': accessToken,
        },
      }
    );

    console.log('Chatwoot response:', response.data);
    
    // Save the user-channel relationship in Supabase
    const chatwootInbox = response.data;
    
    try {
      const { error: insertError } = await supabase
        .from('user_chatwoot_channels')
        .insert({
          user_id: user.id,
          workspace_id,
          chatwoot_account_id: accountId,
          chatwoot_inbox_id: chatwootInbox.id,
          chatwoot_inbox_name: chatwootInbox.name,
          chatwoot_channel_type: 'whatsapp',
          metadata: {
            phone_number: phoneNumber,
            provider: 'whatsapp_cloud',
            phone_number_id: phoneNumberId,
            business_account_id: businessAccountId,
          }
        });

      if (insertError) {
        console.error('Error saving user-channel relationship:', insertError);
        // Don't fail the request if we can't save the relationship
        // The channel was created successfully in Chatwoot
      }
    } catch (supabaseError) {
      console.error('Supabase error:', supabaseError);
      // Continue anyway, channel was created in Chatwoot
    }

    return NextResponse.json(response.data, { status: 200 });
  } catch (error) {
    console.error('Error creating WhatsApp inbox:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('Chatwoot API Error Response:', JSON.stringify(error.response?.data, null, 2));
      console.error('Status Code:', error.response?.status);
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      const errorDetails = error.response?.data;
      const statusCode = error.response?.status || 500;
      
      return NextResponse.json(
        { 
          error: `Failed to create WhatsApp inbox: ${errorMessage}`,
          details: errorDetails,
          statusCode: statusCode
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