import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Returns Chatwoot configuration from environment variables
 * This allows the client to use the correct account ID for SSE connections
 */
export async function GET() {
  return NextResponse.json({
    accountId: parseInt(process.env.CHATWOOT_ACCOUNT_ID || '1'),
  });
}
