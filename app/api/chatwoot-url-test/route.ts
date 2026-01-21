import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  const CHATWOOT_API_URL = process.env.CHATWOOT_API_URL;
  const CHATWOOT_APP_ACCESS_TOKEN = process.env.CHATWOOT_APP_ACCESS_TOKEN;

  if (!CHATWOOT_API_URL || !CHATWOOT_APP_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'Missing config' }, { status: 500 });
  }

  // Remove /api/v1 if it's already in the URL
  const baseUrl = CHATWOOT_API_URL.replace(/\/api\/v1\/?$/, '');
  
  const results: any = {
    originalUrl: CHATWOOT_API_URL,
    cleanedBaseUrl: baseUrl,
    tests: {},
  };

  // Test different URL patterns
  const urlsToTest = [
    `${baseUrl}/api/v1/accounts/2/inboxes`,
    `${CHATWOOT_API_URL}/accounts/2/inboxes`,
    `${baseUrl}/accounts/2/inboxes`,
  ];

  for (const url of urlsToTest) {
    try {
      const response = await axios.get(url, {
        headers: {
          'api_access_token': CHATWOOT_APP_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      results.tests[url] = {
        status: response.status,
        success: true,
        inboxCount: Array.isArray(response.data) ? response.data.length : 'not an array',
        firstInbox: response.data?.[0]?.name || 'N/A',
      };
    } catch (error: any) {
      results.tests[url] = {
        status: error.response?.status || 'error',
        success: false,
        error: error.message,
      };
    }
  }

  return NextResponse.json(results, { status: 200 });
}
