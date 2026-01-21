export type MessageStatus = 'pending' | 'queued' | 'processing' | 'sent' | 'failed' | 'cancelled';
export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'monthly';

export interface ScheduledMessage {
  id: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  message: string;
  scheduled_at: string;
  status: MessageStatus;
  recurrence?: RecurrenceType;
  channel: 'whatsapp' | 'sms' | 'email';
  created_at: string;
  sent_at?: string;
  error_message?: string;
}

export interface CreateScheduledMessageInput {
  customer_id?: string;
  message: string;
  scheduled_at: string;
  recurrence?: RecurrenceType;
  channel: 'whatsapp' | 'sms' | 'email';
  // Group targeting
  target_type?: 'single' | 'group';
  filter_by_tags?: string[];
  filter_by_labels?: string[];
  filter_by_message_age?: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'inactive';
  filter_by_last_interaction?: 'last_24h' | 'last_week' | 'last_month' | 'no_interaction';
}