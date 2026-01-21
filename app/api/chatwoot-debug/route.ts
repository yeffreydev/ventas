import { NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  const CHATWOOT_API_URL = process.env.CHATWOOT_API_URL;
  const CHATWOOT_APP_ACCESS_TOKEN = process.env.CHATWOOT_APP_ACCESS_TOKEN;

  const results: any = {
    timestamp: new Date().toISOString(),
    config: {
      url: CHATWOOT_API_URL,
      hasToken: !!CHATWOOT_APP_ACCESS_TOKEN,
      tokenPrefix: CHATWOOT_APP_ACCESS_TOKEN?.substring(0, 10) + '...',
    },
    database: {},
    apiTests: {},
  };

  try {
    // 1. Verificar base de datos
    const supabase = await createClient(cookies());
    
    // Obtener todos los canales que tienen account_id
    const { data: channels, error } = await supabase
      .from('user_chatwoot_channels')
      .select('chatwoot_account_id, chatwoot_inbox_id, chatwoot_inbox_name')
      .not('chatwoot_account_id', 'is', null)
      .limit(10);

    if (error) {
      results.database.error = error.message;
    } else {
      results.database.channels = channels;
      results.database.uniqueAccountIds = [...new Set(channels?.map(c => c.chatwoot_account_id))];
    }

    if (!CHATWOOT_API_URL || !CHATWOOT_APP_ACCESS_TOKEN) {
      results.apiTests.error = 'Missing API URL or token';
      return NextResponse.json(results, { status: 200 });
    }

    const baseUrl = CHATWOOT_API_URL.replace(/\/$/, '');
    
    // 2. Probar diferentes endpoints de Chatwoot
    const endpointsToTest = [
      '/api/v1/profile',
      '/api/v1/accounts',
      '/platform/api/v1/accounts',
      '/api/v1/conversations',
    ];

    for (const endpoint of endpointsToTest) {
      const testUrl = `${baseUrl}${endpoint}`;
      try {
        const response = await axios.get(testUrl, {
          headers: {
            'api_access_token': CHATWOOT_APP_ACCESS_TOKEN,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        });

        results.apiTests[endpoint] = {
          status: response.status,
          success: true,
          dataPreview: JSON.stringify(response.data).substring(0, 500),
          accountId: response.data?.id || response.data?.[0]?.id || response.data?.account_id,
        };
      } catch (error: any) {
        results.apiTests[endpoint] = {
          status: error.response?.status || 'timeout/error',
          success: false,
          error: error.message,
          errorDataPreview: typeof error.response?.data === 'string' 
            ? error.response?.data.substring(0, 200)
            : JSON.stringify(error.response?.data).substring(0, 200),
        };
      }
    }

    return NextResponse.json(results, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      ...results,
      unexpectedError: error.message,
    }, { status: 500 });
  }
}
