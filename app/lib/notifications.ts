import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';
import type { NotificationType, NotificationPriority } from '@/app/types/notifications';

interface CreateNotificationParams {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  action_url?: string;
  metadata?: Record<string, any>;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const supabase = await createClient(cookies());
    
    // Use RPC function with SECURITY DEFINER to bypass RLS
    const { data, error } = await supabase.rpc('create_notification', {
      p_user_id: params.user_id,
      p_type: params.type,
      p_title: params.title,
      p_message: params.message,
      p_priority: params.priority || 'medium',
      p_action_url: params.action_url || null,
      p_metadata: params.metadata || {},
    });

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    console.log('✅ Notification created:', data);
    return { id: data };
  } catch (error) {
    console.error('Error in createNotification:', error);
    return null;
  }
}

export async function createNotificationForAssignedAgents(
  conversationId: number,
  assigneeId: number | null,
  type: NotificationType,
  title: string,
  message: string,
  priority?: NotificationPriority,
  metadata?: Record<string, any>
) {
  try {
    const supabase = await createClient(cookies());

    // If there's a specific assignee, notify them
    if (assigneeId) {
      // Get the user_id from the agent
      const { data: agent } = await supabase
        .from('agents')
        .select('user_id')
        .eq('chatwoot_user_id', assigneeId)
        .single();

      if (agent?.user_id) {
        await createNotification({
          user_id: agent.user_id,
          type,
          title,
          message,
          priority,
          action_url: `/chats/chat?conversation=${conversationId}`,
          metadata: {
            conversation_id: conversationId,
            assignee_id: assigneeId,
            ...metadata,
          },
        });
      }
    } else {
      // If no assignee, notify all agents with access to this inbox
      // Get the inbox from the conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('inbox_id')
        .eq('id', conversationId)
        .single();

      if (conversation?.inbox_id) {
        // Get all agents with access to this inbox
        const { data: agents } = await supabase
          .from('agents')
          .select('user_id, chatwoot_user_id')
          .eq('account_id', 2); // Assuming account_id 2, adjust if needed

        if (agents && agents.length > 0) {
          // Create notification for each agent
          for (const agent of agents) {
            if (agent.user_id) {
              await createNotification({
                user_id: agent.user_id,
                type,
                title,
                message,
                priority,
                action_url: `/chats/chat?conversation=${conversationId}`,
                metadata: {
                  conversation_id: conversationId,
                  ...metadata,
                },
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error creating notifications for agents:', error);
  }
}