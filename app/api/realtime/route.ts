import { NextRequest } from 'next/server';

// Store for SSE connections
const connections = new Map<string, ReadableStreamDefaultController>();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId') || '2';
  const clientId = Math.random().toString(36).substring(7);

  const stream = new ReadableStream({
    start(controller) {
      // Store connection
      connections.set(clientId, controller);
      
      console.log('🔌 NEW SSE CONNECTION');
      console.log('  Client ID:', clientId);
      console.log('  Account ID:', accountId);
      console.log('  Total Clients:', connections.size);
      
      // Send initial connection message
      const data = `data: ${JSON.stringify({
        type: 'connected',
        clientId,
        accountId,
        message: 'Connected to realtime server'
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));

      console.log(`✅ SSE Client ${clientId} connected. Total: ${connections.size}`);

      // Keep-alive ping every 30 seconds
      const pingInterval = setInterval(() => {
        try {
          const ping = `data: ${JSON.stringify({ type: 'ping' })}\n\n`;
          controller.enqueue(new TextEncoder().encode(ping));
        } catch (error) {
          clearInterval(pingInterval);
          connections.delete(clientId);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        connections.delete(clientId);
        console.log(`SSE Client ${clientId} disconnected. Total: ${connections.size}`);
        try {
          controller.close();
        } catch (e) {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Function to broadcast events to all connected clients
export function broadcastEvent(event: any) {
  console.log('📡 BROADCASTING EVENT');
  console.log('  Event:', event.event);
  console.log('  Total Connections:', connections.size);
  console.log('  Event Data:', JSON.stringify(event, null, 2));
  
  const message = `data: ${JSON.stringify(event)}\n\n`;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  let sent = 0;
  let failed = 0;
  
  connections.forEach((controller, clientId) => {
    try {
      controller.enqueue(data);
      sent++;
      console.log(`  ✅ Sent to client ${clientId}`);
    } catch (error) {
      failed++;
      console.error(`  ❌ Error sending to client ${clientId}:`, error);
      connections.delete(clientId);
    }
  });

  console.log(`📊 Broadcast complete: ${sent} sent, ${failed} failed, ${connections.size} remaining\n`);
}

// Function to get connection count
export function getConnectionCount(): number {
  return connections.size;
}