import { NextRequest } from 'next/server';

// Store for SSE connections with metadata
interface ConnectionInfo {
  controller: ReadableStreamDefaultController;
  accountId: string;
  inboxIds: number[];
  conversationId?: number;
  connectedAt: number;
}

const connections = new Map<string, ConnectionInfo>();

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * SSE endpoint for real-time chat updates
 * Based on Next.js 15 Server-Sent Events best practices
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId') || '2';
  const inboxIds = searchParams.get('inboxIds')?.split(',').map(Number) || [];
  const conversationId = searchParams.get('conversationId') 
    ? Number(searchParams.get('conversationId')) 
    : undefined;
  
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  console.log('🔌 NEW SSE CONNECTION - Chat Stream');
  console.log('  Client ID:', clientId);
  console.log('  Account ID:', accountId);
  console.log('  Inbox IDs:', inboxIds);
  console.log('  Conversation ID:', conversationId);
  console.log('  Total Active Connections:', connections.size);

  // Create a TransformStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Store connection with metadata
      connections.set(clientId, {
        controller,
        accountId,
        inboxIds,
        conversationId,
        connectedAt: Date.now(),
      });

      // Log connection details
      console.log(`📊 Connection details for ${clientId}:`);
      console.log(`  Account: ${accountId}`);
      console.log(`  Inboxes: [${inboxIds.join(', ')}]`);
      console.log(`  Conversation: ${conversationId || 'none'}`);

      // Helper function to send SSE message
      const sendEvent = (data: any, eventType?: string) => {
        try {
          let message = '';
          if (eventType) {
            message += `event: ${eventType}\n`;
          }
          message += `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(new TextEncoder().encode(message));
        } catch (error) {
          console.error('Error sending SSE event:', error);
        }
      };

      // Send initial connection confirmation
      sendEvent({
        type: 'connected',
        clientId,
        accountId,
        inboxIds,
        conversationId,
        timestamp: Date.now(),
        message: 'Connected to chat stream',
      }, 'connection');

      console.log(`✅ SSE Client ${clientId} connected. Total: ${connections.size}`);

      // Keep-alive ping every 30 seconds
      const pingInterval = setInterval(() => {
        try {
          sendEvent({ 
            type: 'ping', 
            timestamp: Date.now(),
            connections: connections.size,
          }, 'ping');
        } catch (error) {
          console.error('Ping failed:', error);
          clearInterval(pingInterval);
          cleanup();
        }
      }, 30000);

      // Cleanup function
      const cleanup = () => {
        clearInterval(pingInterval);
        const conn = connections.get(clientId);
        connections.delete(clientId);
        console.log(`🔌 SSE Client ${clientId} disconnected. Remaining: ${connections.size}`);
        if (conn) {
          console.log(`  Duration: ${Math.round((Date.now() - conn.connectedAt) / 1000)}s`);
        }
        try {
          controller.close();
        } catch (e) {
          // Already closed
        }
      };

      // Handle client disconnect
      request.signal.addEventListener('abort', cleanup);
    },
  });

  // Return SSE response with proper headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

/**
 * Broadcast event to all connected clients
 * Filters by accountId, inboxId, and conversationId if provided
 */
export function broadcastChatEvent(event: {
  event: string;
  accountId: number;
  inboxId?: number;
  conversationId?: number;
  data: any;
  timestamp?: number;
}) {
  console.log('📡 BROADCASTING CHAT EVENT');
  console.log('  Event Type:', event.event);
  console.log('  Account ID:', event.accountId);
  console.log('  Inbox ID:', event.inboxId);
  console.log('  Conversation ID:', event.conversationId);
  console.log('  Total Connections:', connections.size);

  const eventWithTimestamp = {
    ...event,
    timestamp: event.timestamp || Date.now(),
  };

  const message = `data: ${JSON.stringify(eventWithTimestamp)}\n\n`;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  let sent = 0;
  let filtered = 0;
  let failed = 0;

  connections.forEach((conn, clientId) => {
    // Filter by account ID
    if (conn.accountId !== event.accountId.toString()) {
      filtered++;
      return;
    }

    // Filter by inbox ID if specified
    if (event.inboxId && conn.inboxIds.length > 0) {
      if (!conn.inboxIds.includes(event.inboxId)) {
        filtered++;
        return;
      }
    }

    // REMOVED CONVERSATION FILTER - clients need ALL events from their inboxes
    // to update the conversation list in real-time, not just events from active conversation

    // Send event to matching client
    try {
      conn.controller.enqueue(data);
      sent++;
      console.log(`  ✅ Sent to client ${clientId} (Account: ${conn.accountId}, Inboxes: [${conn.inboxIds.join(',')}], Active Conv: ${conn.conversationId || 'none'})`);
    } catch (error) {
      failed++;
      console.error(`  ❌ Failed to send to client ${clientId}:`, error);
      connections.delete(clientId);
    }
  });

  console.log(`📊 Broadcast complete: ${sent} sent, ${filtered} filtered, ${failed} failed, ${connections.size} remaining\n`);
}

/**
 * Get active connection statistics
 */
export function getConnectionStats() {
  const stats = {
    total: connections.size,
    byAccount: new Map<string, number>(),
    byInbox: new Map<number, number>(),
    connections: Array.from(connections.entries()).map(([id, conn]) => ({
      id,
      accountId: conn.accountId,
      inboxIds: conn.inboxIds,
      conversationId: conn.conversationId,
      connectedAt: conn.connectedAt,
      duration: Date.now() - conn.connectedAt,
    })),
  };

  connections.forEach((conn) => {
    // Count by account
    const accountCount = stats.byAccount.get(conn.accountId) || 0;
    stats.byAccount.set(conn.accountId, accountCount + 1);

    // Count by inbox
    conn.inboxIds.forEach((inboxId) => {
      const inboxCount = stats.byInbox.get(inboxId) || 0;
      stats.byInbox.set(inboxId, inboxCount + 1);
    });
  });

  return stats;
}

/**
 * Close all connections (useful for cleanup/restart)
 */
export function closeAllConnections() {
  console.log(`🔌 Closing all ${connections.size} SSE connections`);
  connections.forEach((conn, clientId) => {
    try {
      conn.controller.close();
    } catch (e) {
      // Already closed
    }
  });
  connections.clear();
}