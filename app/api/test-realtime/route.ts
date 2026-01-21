import { NextRequest, NextResponse } from 'next/server';
import { broadcastEvent } from '@/app/api/realtime/route';
import { addEvent } from '@/app/api/events/latest/route';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, conversationId, messageContent } = body;

    // Create a test event
    const testEvent = {
      event: eventType || 'message.created',
      accountId: 2,
      conversationId: conversationId || 1,
      data: {
        message: {
          id: Date.now(),
          content: messageContent || 'Mensaje de prueba en tiempo real',
          message_type: 0,
          created_at: Date.now() / 1000,
          sender: {
            name: 'Test User',
            email: 'test@example.com'
          },
          conversation_id: conversationId || 1,
        },
        conversation: {
          id: conversationId || 1,
          status: 'open'
        }
      },
      timestamp: Date.now()
    };

    // Broadcast to SSE clients
    console.log('🧪 TEST: Broadcasting test event to SSE clients...');
    broadcastEvent(testEvent);

    // Also store in events API for polling
    console.log('🧪 TEST: Storing test event in memory...');
    addEvent(testEvent);

    console.log('✅ TEST: Test event processed successfully');

    return NextResponse.json({ 
      success: true,
      event: testEvent,
      message: 'Test event sent successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('❌ TEST: Error processing test event:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('🧪 TEST: Test endpoint is active');
  
  return NextResponse.json({ 
    status: 'active',
    endpoint: '/api/test-realtime',
    message: 'Test endpoint is ready to send events',
    usage: {
      POST: {
        description: 'Send a test event to the realtime system',
        body: {
          eventType: 'message.created | conversation.created | conversation.updated | conversation.status_changed',
          conversationId: 'number (optional, defaults to 1)',
          messageContent: 'string (optional, defaults to "Mensaje de prueba en tiempo real")'
        }
      }
    }
  }, { status: 200 });
}