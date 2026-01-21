import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';

// This endpoint should be called by a cron job or background worker
// POST - Process and send due scheduled messages
export async function POST(request: NextRequest) {
  try {
    // Verify this is an internal/cron request (you might want to add authentication)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient(cookies());

    // Get all pending messages that are due
    const now = new Date().toISOString();
    const { data: dueMessages, error: fetchError } = await supabase
      .from('scheduled_messages')
      .select(`
        *,
        customer:customers(id, name, phone, email, chatwoot_contact_id),
        user:user_id(id, email)
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching due messages:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!dueMessages || dueMessages.length === 0) {
      return NextResponse.json({ 
        message: 'No messages to process',
        processed: 0 
      });
    }

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Process each message
    for (const message of dueMessages) {
      try {
        // Mark as processing
        await supabase
          .from('scheduled_messages')
          .update({ status: 'processing' })
          .eq('id', message.id);

        let sendResults: any[] = [];

        if (message.target_type === 'single') {
          // Send to single customer
          const result = await sendToCustomer(supabase, message, message.customer);
          sendResults = [result];
        } else {
          // Get all target customers for group message
          const { data: sends, error: sendsError } = await supabase
            .from('scheduled_message_sends')
            .select(`
              *,
              customer:customers(id, name, phone, email, chatwoot_contact_id)
            `)
            .eq('scheduled_message_id', message.id)
            .eq('status', 'pending');

          if (sendsError) {
            throw new Error(`Error fetching sends: ${sendsError.message}`);
          }

          // Send to each customer in the group
          for (const send of sends || []) {
            const result = await sendToCustomer(supabase, message, send.customer, send.id);
            sendResults.push(result);
          }
        }

        // Check if all sends were successful
        const allSuccess = sendResults.every(r => r.success);
        const anySuccess = sendResults.some(r => r.success);

        // Update message status
        const finalStatus = allSuccess ? 'sent' : (anySuccess ? 'sent' : 'failed');
        const errorMessages = sendResults
          .filter(r => !r.success)
          .map(r => r.error)
          .join('; ');

        await supabase
          .from('scheduled_messages')
          .update({
            status: finalStatus,
            sent_at: allSuccess ? new Date().toISOString() : null,
            error_message: errorMessages || null,
          })
          .eq('id', message.id);

        // Handle recurrence
        if (message.recurrence !== 'once' && allSuccess) {
          await handleRecurrence(supabase, message);
        }

        results.processed++;
        if (allSuccess) {
          results.sent++;
        } else {
          results.failed++;
        }
      } catch (error: any) {
        console.error(`Error processing message ${message.id}:`, error);
        results.failed++;
        results.errors.push({
          messageId: message.id,
          error: error.message,
        });

        // Mark as failed
        await supabase
          .from('scheduled_messages')
          .update({
            status: 'failed',
            error_message: error.message,
          })
          .eq('id', message.id);
      }
    }

    return NextResponse.json({
      message: 'Processing complete',
      ...results,
    });
  } catch (error) {
    console.error('Error in POST /api/scheduled-messages/process:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to send message to a customer
async function sendToCustomer(
  supabase: any,
  message: any,
  customer: any,
  sendId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Get user's Chatwoot channel configuration
    const { data: channelConfig, error: channelError } = await supabase
      .from('user_chatwoot_channels')
      .select('*')
      .eq('user_id', message.user_id)
      .eq('channel_type', message.channel)
      .single();

    if (channelError || !channelConfig) {
      throw new Error('Channel configuration not found');
    }

    // Send message via Chatwoot API
    const chatwootUrl = channelConfig.chatwoot_url;
    const apiKey = channelConfig.api_access_token;
    const accountId = channelConfig.account_id;
    const inboxId = channelConfig.inbox_id;

    // Create or get conversation
    let conversationId = customer.chatwoot_conversation_id;

    if (!conversationId) {
      // Create new conversation
      const createConvResponse = await fetch(
        `${chatwootUrl}/api/v1/accounts/${accountId}/conversations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api_access_token': apiKey,
          },
          body: JSON.stringify({
            inbox_id: inboxId,
            contact_id: customer.chatwoot_contact_id,
            status: 'open',
          }),
        }
      );

      if (!createConvResponse.ok) {
        throw new Error('Failed to create conversation');
      }

      const convData = await createConvResponse.json();
      conversationId = convData.id;
    }

    // Send the message
    const sendResponse = await fetch(
      `${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': apiKey,
        },
        body: JSON.stringify({
          content: message.message,
          message_type: 'outgoing',
          private: false,
        }),
      }
    );

    if (!sendResponse.ok) {
      throw new Error(`Failed to send message: ${sendResponse.statusText}`);
    }

    // Update send record if it's a group message
    if (sendId) {
      await supabase
        .from('scheduled_message_sends')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', sendId);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending to customer:', error);

    // Update send record if it's a group message
    if (sendId) {
      await supabase
        .from('scheduled_message_sends')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', sendId);
    }

    return { success: false, error: error.message };
  }
}

// Helper function to handle message recurrence
async function handleRecurrence(supabase: any, message: any) {
  try {
    const currentScheduledAt = new Date(message.scheduled_at);
    let nextScheduledAt: Date;

    switch (message.recurrence) {
      case 'daily':
        nextScheduledAt = new Date(currentScheduledAt);
        nextScheduledAt.setDate(nextScheduledAt.getDate() + 1);
        break;
      case 'weekly':
        nextScheduledAt = new Date(currentScheduledAt);
        nextScheduledAt.setDate(nextScheduledAt.getDate() + 7);
        break;
      case 'monthly':
        nextScheduledAt = new Date(currentScheduledAt);
        nextScheduledAt.setMonth(nextScheduledAt.getMonth() + 1);
        break;
      default:
        return; // No recurrence
    }

    // Create a new scheduled message for the next occurrence
    const { data: newMessage, error: createError } = await supabase
      .from('scheduled_messages')
      .insert({
        user_id: message.user_id,
        target_type: message.target_type,
        customer_id: message.customer_id,
        message: message.message,
        scheduled_at: nextScheduledAt.toISOString(),
        recurrence: message.recurrence,
        channel: message.channel,
        filter_by_tags: message.filter_by_tags,
        filter_by_labels: message.filter_by_labels,
        filter_by_message_age: message.filter_by_message_age,
        filter_by_last_interaction: message.filter_by_last_interaction,
        status: 'pending',
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // If it's a group message, recalculate and create sends
    if (message.target_type === 'group') {
      const { data: customers, error: customersError } = await supabase.rpc(
        'get_customers_for_scheduled_message',
        {
          p_user_id: message.user_id,
          p_filter_by_tags: message.filter_by_tags,
          p_filter_by_labels: message.filter_by_labels,
          p_filter_by_message_age: message.filter_by_message_age,
          p_filter_by_last_interaction: message.filter_by_last_interaction,
        }
      );

      if (!customersError && customers && customers.length > 0) {
        const sends = customers.map((c: any) => ({
          scheduled_message_id: newMessage.id,
          customer_id: c.customer_id,
          status: 'pending',
        }));

        await supabase.from('scheduled_message_sends').insert(sends);
      }
    }
  } catch (error) {
    console.error('Error handling recurrence:', error);
    // Don't throw - we don't want to fail the current send because of recurrence issues
  }
}