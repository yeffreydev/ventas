export type NotificationType = 
  | 'new_message'
  | 'new_conversation'
  | 'assignment'
  | 'reminder'
  | 'order_update'
  | 'system'
  | 'mention'
  | 'invitation';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read: boolean;
  action_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
  read_at?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  sound_enabled: boolean;
  browser_notifications: boolean;
  notification_types: {
    [key in NotificationType]: boolean;
  };
}