'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '../utils/supabase/client';
import type { Notification, NotificationSettings } from '../types/notifications';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  settings: NotificationSettings | null;
  isLoading: boolean;
  permissionStatus: NotificationPermission;
  requestPermission: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  playNotificationSound: () => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [userId, setUserId] = useState<string | null>(null);
  
  const supabase = createClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const realtimeChannelRef = useRef<any>(null);

  // Initialize audio for notification sound
  useEffect(() => {
    // Create a simple notification sound using Web Audio API
    const createNotificationSound = () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    };

    audioRef.current = {
      play: createNotificationSound
    } as any;

    // Check initial permission status
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, [supabase]);

  // Fetch notifications and settings
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: notifs, error: notifsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (notifsError) throw notifsError;

      setNotifications(notifs || []);
      setUnreadCount(notifs?.filter((n: Notification) => !n.read).length || 0);

      // Fetch settings with better error handling
      const { data: settingsData, error: settingsError } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid 406 errors

      // Only throw if it's not a "no rows" error
      if (settingsError && settingsError.code !== 'PGRST116') {
        console.warn('Error fetching notification settings:', settingsError);
        // Don't throw, just use defaults
      }

      setSettings(settingsData || {
        enabled: true,
        sound_enabled: true,
        browser_notifications: true,
        notification_types: {
          new_message: true,
          new_conversation: true,
          assignment: true,
          reminder: true,
          order_update: true,
          system: true,
          mention: true,
          invitation: true,
        },
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Set defaults even on error to prevent app crash
      setSettings({
        enabled: true,
        sound_enabled: true,
        browser_notifications: true,
        notification_types: {
          new_message: true,
          new_conversation: true,
          assignment: true,
          reminder: true,
          order_update: true,
          system: true,
          mention: true,
          invitation: true,
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, supabase]);

  // Fetch notifications on mount and when userId changes
  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId]); // Remove fetchNotifications from dependencies to prevent infinite loop

  // Set up real-time subscription with error handling
  useEffect(() => {
    if (!userId || !settings) return;

    let channel: any = null;
    let isSubscribed = false;

    const setupRealtimeSubscription = async () => {
      try {
        channel = supabase
          .channel(`notifications-${userId}`, {
            config: {
              broadcast: { self: false },
              presence: { key: userId },
            },
          })
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`,
            },
            (payload: any) => {
              if (!isSubscribed) return;
              
              const newNotification = payload.new as Notification;
              
              setNotifications(prev => [newNotification, ...prev]);
              setUnreadCount(prev => prev + 1);

              // Play sound if enabled
              if (settings?.sound_enabled) {
                playNotificationSound();
              }

              // Show browser notification if enabled and permitted
              if (
                settings?.browser_notifications &&
                permissionStatus === 'granted' &&
                settings.notification_types?.[newNotification.type]
              ) {
                showBrowserNotification(newNotification);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`,
            },
            (payload: any) => {
              if (!isSubscribed) return;
              
              const updatedNotification = payload.new as Notification;
              setNotifications(prev =>
                prev.map(n => (n.id === updatedNotification.id ? updatedNotification : n))
              );
              
              if (updatedNotification.read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`,
            },
            (payload: any) => {
              if (!isSubscribed) return;
              
              const deletedId = payload.old.id;
              setNotifications(prev => prev.filter(n => n.id !== deletedId));
            }
          )
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              isSubscribed = true;
              console.log('✅ Notifications realtime connected');
            } else if (status === 'CLOSED') {
              isSubscribed = false;
              console.warn('⚠️ Notifications realtime connection closed');
            } else if (status === 'CHANNEL_ERROR') {
              isSubscribed = false;
              console.error('❌ Notifications realtime error');
            }
          });

        realtimeChannelRef.current = channel;
      } catch (error) {
        console.error('Error setting up realtime subscription:', error);
        // Don't crash the app, just log the error
      }
    };

    setupRealtimeSubscription();

    return () => {
      isSubscribed = false;
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.error('Error removing channel:', error);
        }
      }
    };
  }, [userId, settings?.sound_enabled, settings?.browser_notifications, permissionStatus]); // Simplified dependencies

  const playNotificationSound = useCallback(() => {
    if (audioRef.current && settings?.sound_enabled) {
      try {
        (audioRef.current as any).play();
      } catch (error) {
        console.error('Error playing notification sound:', error);
      }
    }
  }, [settings]);

  const showBrowserNotification = useCallback((notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotif = new Notification(notification.title, {
        body: notification.message,
        icon: '/botia.svg',
        badge: '/botia.svg',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent',
      });

      browserNotif.onclick = () => {
        window.focus();
        if (notification.action_url) {
          window.location.href = notification.action_url;
        }
        browserNotif.close();
      };
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      
      if (permission === 'granted' && settings) {
        await updateSettings({ browser_notifications: true });
      }
    }
  }, [settings]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase.rpc('mark_notification_read', {
        notification_id: notificationId,
      });

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [supabase]);

  const markAllAsRead = useCallback(async () => {
    try {
      const { error } = await supabase.rpc('mark_all_notifications_read');

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [supabase]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [supabase]);

  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    if (!userId) return;

    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: userId,
          ...updatedSettings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setSettings(updatedSettings as NotificationSettings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  }, [userId, settings, supabase]);

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    settings,
    isLoading,
    permissionStatus,
    requestPermission,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateSettings,
    playNotificationSound,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}