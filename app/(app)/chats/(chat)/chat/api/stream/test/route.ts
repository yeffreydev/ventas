import { NextRequest, NextResponse } from 'next/server';
import { broadcastChatEvent, getConnectionStats } from '../route';

/**
 * Test endpoint to verify SSE implementation
 * GET /chats/chat/api/stream/test - Get connection stats
 * POST /chats/chat/api/stream/test - Send test event
 */

export async function GET(request: NextRequest) {
  try {
    const stats = getConnectionStats();
    
    return NextResponse.json({
      success: true,
      message: 'SSE endpoint is operational',
      stats: {
        totalConnections: stats.total,
        byAccount: Object.fromEntries(stats.byAccount),
        byInbox: Object.fromEntries(stats.byInbox),
        connections: stats.connections.map(conn => ({
          id: conn.id,
          accountId: conn.accountId,
          inboxIds: conn.inboxIds,
          conversationId: conn.conversationId,
          connectedAt: new Date(conn.connectedAt).toISOString(),
          durationMs: conn.duration,
          durationSeconds: Math.floor(conn.duration / 1000),
        })),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting SSE stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get connection stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.accountId) {
      return NextResponse.json(
        { success: false, error: 'accountId is required' },
        { status: 400 }
      );
    }

    // Create test event
    const testEvent = {
      event: body.event || 'message.created',
      accountId: body.accountId,
      inboxId: body.inboxId,
      conversationId: body.conversationId,
      data: body.data || {
        message: {
          id: Math.floor(Math.random() * 10000),
          content: body.content || 'Test message from SSE test endpoint',
          message_type: 1,
          created_at: Date.now() / 1000,
          sender: {
            id: 1,
            name: 'Test User',
            type: 'agent_bot',
          },
        },
        conversation: {
          id: body.conversationId || 1,
        },
      },
      timestamp: Date.now(),
    };

    console.log('📤 Sending test event:', testEvent);

    // Broadcast test event
    broadcastChatEvent(testEvent);

    const stats = getConnectionStats();

    return NextResponse.json({
      success: true,
      message: 'Test event broadcasted successfully',
      event: testEvent,
      stats: {
        totalConnections: stats.total,
        byAccount: Object.fromEntries(stats.byAccount),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sending test event:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send test event',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}