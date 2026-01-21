import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  const CHATWOOT_API_URL = process.env.CHATWOOT_API_URL;
  const CHATWOOT_APP_ACCESS_TOKEN = process.env.CHATWOOT_APP_ACCESS_TOKEN;

  if (!CHATWOOT_API_URL || !CHATWOOT_APP_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'Missing config' }, { status: 500 });
  }

  const baseUrl = CHATWOOT_API_URL.replace(/\/api\/v1\/?$/, '');
  
  const results: any = {};

  // Try account IDs 1-5
  for (let accountId = 1; accountId <= 5; accountId++) {
    const url = `${baseUrl}/api/v1/accounts/${accountId}/inboxes`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'api_access_token': CHATWOOT_APP_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      results[`Account ${accountId}`] = {
        url,
        status: response.status,
        success: true,
        inboxCount: Array.isArray(response.data) ? response.data.length : response.data?.payload?.length || 'unknown',
        inboxes: response.data?.payload || response.data || [],
      };
    } catch (error: any) {
      results[`Account ${accountId}`] = {
        url,
        status: error.response?.status || 'error',
        success: false,
      };
    }
  }

  return NextResponse.json(results, { status: 200 });
}
