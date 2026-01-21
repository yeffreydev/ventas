export interface Reminder {
  id: string;
  user_id: string;
  customer_id?: string;
  conversation_id?: number;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_from_message_id?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface CreateReminderInput {
  customer_id?: string;
  conversation_id?: number;
  title: string;
  description?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  created_from_message_id?: number;
}

export interface UpdateReminderInput {
  title?: string;
  description?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}