'use client';

import { useState, useRef, useEffect } from 'react';
import { HiBell, HiCheck, HiCheckCircle, HiTrash } from 'react-icons/hi';
import { useNotifications } from '../providers/NotificationProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Notification } from '../types/notifications';
import { formatDistanceToNow } from '../utils/dateUtils';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    permissionStatus,
    requestPermission,
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (notification.action_url) {
      window.location.href = notification.action_url;
      setIsOpen(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_message':
        return '💬';
      case 'new_conversation':
        return '🆕';
      case 'assignment':
        return '👤';
      case 'reminder':
        return '⏰';
      case 'order_update':
        return '📦';
      case 'mention':
        return '@';
      case 'invitation':
        return '✉️';
      case 'system':
        return '⚙️';
      default:
        return '🔔';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700';
      case 'medium':
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
      case 'low':
        return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600';
      default:
        return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600';
    }
  };

  // Filter to show only unread notifications in dropdown
  const unreadNotifications = notifications.filter((n: Notification) => !n.read);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-hover-bg rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <HiBell className="w-6 h-6 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[20px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-background bg-background-bg rounded-lg shadow-xl border border-border z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">
              Notificaciones
              {unreadCount > 0 && (
                <span className="ml-2 text-sm text-text-secondary">
                  ({unreadCount} sin leer)
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                  title="Marcar todas como leídas"
                >
                  <HiCheckCircle className="w-4 h-4" />
                  Marcar todas
                </button>
              )}
            </div>
          </div>

          {/* Permission Request Banner */}
          {permissionStatus === 'default' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-border">
              <div className="flex items-start gap-2">
                <HiBell className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium">
                    Habilitar notificaciones del navegador
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    Recibe alertas incluso cuando no estés en la aplicación
                  </p>
                  <button
                    onClick={requestPermission}
                    className="mt-2 text-xs bg-primary text-white px-3 py-1 rounded hover:bg-primary/90 transition-colors"
                  >
                    Habilitar
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Notificaciones</h3>
            <Link
              href="/notifications"
              className="text-sm text-primary hover:underline"
              onClick={() => setIsOpen(false)}
            >
              Ver todas
            </Link>
          </div>

          {/* Content */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-text-secondary">Cargando notificaciones...</p>
              </div>
            ) : unreadNotifications.length === 0 ? (
              <div className="p-8 text-center text-text-secondary">
                <HiBell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No tienes notificaciones nuevas</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {unreadNotifications.map((notification) => {
                  const isInvitation = notification.type === 'invitation';
                  const workspaceName = notification.metadata?.workspace_name || 'un espacio de trabajo';
                  
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 transition-colors ${
                        !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                      } ${isInvitation ? '' : 'hover:bg-hover-bg cursor-pointer'}`}
                      onClick={() => !isInvitation && handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 text-2xl">
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-foreground">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1"></div>
                            )}
                          </div>
                          <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          {/* Special rendering for invitations */}
                          {isInvitation && (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-text-tertiary">Espacio:</span>
                                <span className="font-medium text-foreground">{workspaceName}</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotificationClick(notification);
                                  }}
                                  className="flex-1 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                                >
                                  Aceptar Invitación
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                  className="px-3 py-2 border border-current/20 text-text-secondary rounded-lg hover:bg-hover-bg transition-colors text-sm"
                                >
                                  Ignorar
                                </button>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-text-tertiary">
                              {formatDistanceToNow(notification.created_at)}
                            </span>
                            {notification.priority !== 'medium' && (
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(
                                  notification.priority
                                )}`}
                              >
                                {notification.priority === 'urgent'
                                  ? 'Urgente'
                                  : notification.priority === 'high'
                                  ? 'Alta'
                                  : 'Baja'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions - only show for non-invitation notifications */}
                        {!isInvitation && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!notification.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="p-1.5 hover:bg-hover-bg rounded transition-colors"
                                title="Marcar como leída"
                              >
                                <HiCheck className="w-4 h-4 text-text-secondary" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="p-1.5 hover:bg-hover-bg rounded transition-colors"
                              title="Eliminar"
                            >
                              <HiTrash className="w-4 h-4 text-text-secondary hover:text-red-600" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-border text-center">
              <button
                onClick={() => {
                  window.location.href = '/notifications';
                  setIsOpen(false);
                }}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Ver todas las notificaciones
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}