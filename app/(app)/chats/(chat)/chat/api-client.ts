import axios from 'axios';

export interface CustomerLink {
  link_id: string;
  conversation_id: number;
  linked_at: string;
  notes?: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  identity_document_type: string;
  identity_document_number: string;
  city?: string;
  province?: string;
  district?: string;
  address?: string;
  stage: string;
}

export interface ChatwootConversation {
  id: number;
  account_id: number;
  inbox_id: number;
  status: string;
  timestamp: number;
  contact_last_seen_at: number;
  agent_last_seen_at: number;
  unread_count: number;
  additional_attributes: any;
  meta: {
    sender: {
      id: number;
      name: string;
      phone_number?: string;
      email?: string;
      thumbnail?: string;
    };
    channel: string;
  };
  messages: any[];
  last_non_activity_message?: {
    content: string;
    created_at: number;
  };
  customer_link?: CustomerLink | null;
}

export interface ChatwootMessage {
  id: number;
  content: string;
  message_type: number; // 0: incoming, 1: outgoing, 2: activity
  created_at: number;
  conversation_id: number;
  sender?: {
    id: number;
    name: string;
    type: string;
  };
  attachments?: any[];
}

export interface ChatwootInbox {
  id: number;
  name: string;
  channel_type: string;
  phone_number?: string;
  avatar_url?: string;
}

export async function getConversations(status: string = 'open', inboxId?: number, workspaceId?: string) {
  try {
    const params = new URLSearchParams({ status });
    if (inboxId) {
      params.append('inbox_id', inboxId.toString());
    }
    if (workspaceId) {
      params.append('workspace_id', workspaceId);
    }

    const response = await axios.get(`/chats/chat/api/conversations?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
}

export async function getMessages(conversationId: number, workspaceId?: string) {
  try {
    const params = new URLSearchParams({ conversation_id: conversationId.toString() });
    if (workspaceId) {
      params.append('workspace_id', workspaceId);
    }

    const response = await axios.get(`/chats/chat/api/messages?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

export async function getInboxes(workspaceId?: string) {
  try {
    const params = new URLSearchParams();
    if (workspaceId) {
      params.append('workspace_id', workspaceId);
    }

    const response = await axios.get(`/chats/chat/api/inboxes?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching inboxes:', error);
    throw error;
  }
}

export async function sendMessage(conversationId: number, content: string, files?: File[], messageType: string = 'outgoing', workspaceId?: string) {
  try {
    const formData = new FormData();
    formData.append('conversationId', conversationId.toString());
    formData.append('content', content || ''); // Allow empty content if files are present
    formData.append('messageType', messageType);
    formData.append('private', 'false');
    if (workspaceId) {
      formData.append('workspaceId', workspaceId);
    }

    // Add files if provided - use 'attachments' as the field name (not 'attachments[]')
    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append('attachments', file);
      });
    }

    const response = await axios.post('/chats/chat/api/send-message', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Production-safe timeouts and limits (must match or exceed server timeout)
      timeout: 180000, // 3 minutes for large files (matches server)
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Chat-Customer Link functions
export async function getCustomerLink(conversationId: number) {
  try {
    const response = await axios.get(`/api/chat-customer-links?conversation_id=${conversationId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching customer link:', error);
    throw error;
  }
}

export async function linkCustomerToChat(conversationId: number, customerId: string, notes?: string) {
  try {
    const response = await axios.post('/api/chat-customer-links', {
      conversation_id: conversationId,
      customer_id: customerId,
      notes,
    });
    return response.data;
  } catch (error) {
    console.error('Error linking customer to chat:', error);
    throw error;
  }
}

export async function unlinkCustomerFromChat(conversationId: number) {
  try {
    const response = await axios.delete(`/api/chat-customer-links?conversation_id=${conversationId}`);
    return response.data;
  } catch (error) {
    console.error('Error unlinking customer from chat:', error);
    throw error;
  }
}

// Mark messages as read
export async function markMessagesAsRead(conversationId: number, agentLastSeenAt?: number, workspaceId?: string) {
  try {
    const response = await axios.post('/chats/chat/api/mark-read', {
      conversationId,
      agentLastSeenAt,
      workspaceId,
    });
    return response.data;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
}