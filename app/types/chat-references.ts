// Types for chat_references table
export type ChatStatus = 'open' | 'resolved' | 'pending' | 'snoozed';

export interface ChatReference {
  id: string;
  customer_id: string;
  chatwoot_conversation_id: number;
  chatwoot_inbox_id: number | null;
  chatwoot_account_id: number | null;
  status: ChatStatus;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  metadata: Record<string, any>;
}

export interface ChatReferenceWithCustomer extends ChatReference {
  customer_name: string;
  customer_email: string;
  customer_document: string;
  customer_stage: string;
}

export interface CreateChatReferenceInput {
  customer_id: string;
  chatwoot_conversation_id: number;
  chatwoot_inbox_id?: number;
  chatwoot_account_id?: number;
  status?: ChatStatus;
  last_message_at?: string;
  metadata?: Record<string, any>;
}

export interface UpdateChatReferenceInput {
  status?: ChatStatus;
  last_message_at?: string;
  metadata?: Record<string, any>;
}