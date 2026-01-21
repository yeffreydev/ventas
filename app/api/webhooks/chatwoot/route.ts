import { NextRequest, NextResponse } from 'next/server';
import { broadcastChatEvent, getConnectionStats } from '@/app/(app)/chats/(chat)/chat/api/stream/route';
import { addEvent } from '@/app/api/events/latest/route';
import { createNotificationForAssignedAgents } from '@/app/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log everything
    console.log('\n' + '='.repeat(100));
    console.log('🔔 CHATWOOT WEBHOOK RECEIVED AT:', new Date().toISOString());
    console.log('='.repeat(100));
    console.log('📋 FULL PAYLOAD:');
    console.log(JSON.stringify(body, null, 2));
    console.log('='.repeat(100));

    // Parse event type and data
    const eventType = body.event;
    const accountId = body.account?.id || 2;
    const inboxId = body.inbox?.id;
    const conversationId = body.conversation?.id;

    // For message_created, the message data is in the root level
    const messageData = {
      id: body.id,
      content: body.content,
      message_type: body.message_type === 'incoming' ? 0 : body.message_type === 'outgoing' ? 1 : 2,
      created_at: new Date(body.created_at).getTime() / 1000,
      sender: body.sender,
      attachments: body.attachments || [],
      conversation_id: conversationId,
    };

    console.log('📊 PARSED DATA:');
    console.log('  Event Type:', eventType);
    console.log('  Account ID:', accountId);
    console.log('  Inbox ID:', inboxId);
    console.log('  Conversation ID:', conversationId);
    console.log('  Message ID:', messageData.id);
    console.log('  Message Content:', messageData.content);
    console.log('  Message Type:', messageData.message_type);
    console.log('  Sender:', body.sender?.name);
    console.log('='.repeat(100) + '\n');

    // Map Chatwoot events to internal events
    let internalEvent: string;
    let eventData: any;

    switch (eventType) {
      case 'message_created':
      case 'message_updated': // Handle both creation and updates (status changes)
        internalEvent = 'message.created'; // Use same event type for consistency
        eventData = {
          message: messageData,
          conversation: body.conversation,
          sender: body.sender,
        };
        console.log(`✅ Processing ${eventType} event`);
        console.log('📦 Event data to broadcast:', JSON.stringify(eventData, null, 2));
        
        // Create notification for incoming messages (only on message_created, not updates)
        if (eventType === 'message_created' && messageData.message_type === 0) { // incoming message
          const senderName = body.sender?.name || 'Cliente';
          const conversationDisplayId = body.conversation?.display_id || conversationId;
          
          console.log('📬 Creating notification for incoming message...');
          await createNotificationForAssignedAgents(
            conversationId,
            body.conversation?.assignee_id || null,
            'new_message',
            `Nuevo mensaje de ${senderName}`,
            messageData.content || 'Mensaje sin contenido',
            'high',
            {
              sender_name: senderName,
              conversation_display_id: conversationDisplayId,
              message_id: messageData.id,
            }
          );
          console.log('✅ Notification created for incoming message');
        }
        break;

      case 'conversation_created':
        internalEvent = 'conversation.created';
        // Chatwoot sends the conversation data at the root level for conversation_created
        eventData = {
          conversation: body.conversation || body,
        };
        console.log('✅ Processing conversation_created event');
        console.log('📦 Conversation data:', JSON.stringify(eventData.conversation, null, 2));
        
        // Create notification for new conversation
        const conversation = body.conversation || body;
        const contactName = conversation.meta?.sender?.name || 'Cliente';
        const conversationDisplayId = conversation.display_id || conversationId;
        
        console.log('📬 Creating notification for new conversation...');
        await createNotificationForAssignedAgents(
          conversationId,
          conversation.assignee_id || null,
          'new_conversation',
          `Nueva conversación de ${contactName}`,
          `Conversación #${conversationDisplayId} iniciada`,
          'medium',
          {
            contact_name: contactName,
            conversation_display_id: conversationDisplayId,
          }
        );
        console.log('✅ Notification created for new conversation');
        break;

      case 'conversation_status_changed':
        internalEvent = 'conversation.status_changed';
        eventData = {
          conversation: body.conversation,
          status: body.status,
        };
        console.log('✅ Processing conversation_status_changed event');
        break;

      case 'conversation_updated':
        internalEvent = 'conversation.updated';
        eventData = {
          conversation: body.conversation,
        };
        console.log('✅ Processing conversation_updated event');
        break;

      default:
        console.log(`⚠️  Unhandled event type: ${eventType}`);
        return NextResponse.json({ received: true, event: eventType }, { status: 200 });
    }

    const eventToSend = {
      event: internalEvent,
      accountId,
      inboxId,
      conversationId,
      data: eventData,
      timestamp: Date.now(),
    };

    // Broadcast to SSE clients using the new chat stream endpoint
    console.log(`📡 Broadcasting ${internalEvent} to chat SSE clients...`);
    broadcastChatEvent(eventToSend);

    // Also store in events API for polling fallback
    console.log(`💾 Storing event in memory for polling fallback...`);
    addEvent(eventToSend);

    const stats = getConnectionStats();
    console.log(`✅ Event ${internalEvent} processed successfully`);
    console.log(`📊 Active SSE connections: ${stats.total}`);
    console.log(`📊 Connection stats:`, JSON.stringify(stats, null, 2));
    console.log('');

    return NextResponse.json({ 
      received: true, 
      event: internalEvent,
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    console.error('\n' + '❌'.repeat(50));
    console.error('ERROR processing Chatwoot webhook:', error);
    console.error('❌'.repeat(50) + '\n');
    
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Handle GET for webhook verification
export async function GET(request: NextRequest) {
  console.log('🔍 Webhook GET request received (verification)');
  
  const { searchParams } = new URL(request.url);
  const hubChallenge = searchParams.get('hub.challenge');
  
  if (hubChallenge) {
    console.log('✅ Returning hub.challenge:', hubChallenge);
    return new NextResponse(hubChallenge, { status: 200 });
  }
  
  console.log('ℹ️  Webhook endpoint is active and ready');
  return NextResponse.json({ 
    status: 'active',
    endpoint: '/api/webhooks/chatwoot',
    message: 'Webhook is ready to receive events from Chatwoot'
  }, { status: 200 });
}