'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
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

// Default settings to avoid null checks
const defaultSettings: NotificationSettings = {
  enabled: false,
  sound_enabled: false,
  browser_notifications: false,
  notification_types: {
    new_message: false,
    new_conversation: false,
    assignment: false,
    reminder: false,
    order_update: false,
    system: false,
    mention: false,
    invitation: false,
  },
};

/**
 * Lightweight NotificationProvider - notifications disabled for performance optimization
 * All realtime subscriptions and heavy operations have been removed to improve load times
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications] = useState<Notification[]>([]);
  const [unreadCount] = useState(0);
  const [settings] = useState<NotificationSettings>(defaultSettings);
  const [isLoading] = useState(false);
  const [permissionStatus] = useState<NotificationPermission>('default');

  // No-op functions - notifications are disabled
  const requestPermission = useCallback(async () => {}, []);
  const markAsRead = useCallback(async (_notificationId: string) => {}, []);
  const markAllAsRead = useCallback(async () => {}, []);
  const deleteNotification = useCallback(async (_notificationId: string) => {}, []);
  const updateSettings = useCallback(async (_settings: Partial<NotificationSettings>) => {}, []);
  const playNotificationSound = useCallback(() => {}, []);
  const refreshNotifications = useCallback(async () => {}, []);

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