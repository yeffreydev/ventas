export interface UserChatwootChannel {
  id: string;
  user_id: string;
  chatwoot_account_id: number;
  chatwoot_inbox_id: number;
  chatwoot_inbox_name: string | null;
  chatwoot_channel_type: string | null;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateUserChatwootChannelParams {
  user_id: string;
  chatwoot_account_id: number;
  chatwoot_inbox_id: number;
  chatwoot_inbox_name?: string;
  chatwoot_channel_type?: 'whatsapp' | 'telegram' | 'email' | 'web' | 'api' | 'sms' | string;
  metadata?: Record<string, any>;
}

export interface UpdateUserChatwootChannelParams {
  chatwoot_inbox_name?: string;
  chatwoot_channel_type?: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export interface ActiveUserChannel {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  chatwoot_account_id: number;
  chatwoot_inbox_id: number;
  chatwoot_inbox_name: string | null;
  chatwoot_channel_type: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}