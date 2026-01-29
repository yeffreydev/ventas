'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HiBell, HiTrash, HiCheckCircle, HiX } from 'react-icons/hi';
import { useNotifications } from '@/app/providers/NotificationProvider';
import { formatDistanceToNow } from '@/app/utils/dateUtils';
import { createClient } from "@/app/utils/supabase/client";
import type { Notification } from '@/app/types/notifications';

export default function NotificationsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { notifications, isLoading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter((n: Notification) => !n.read)
    : notifications;

  const handleAcceptInvitation = async (notification: Notification) => {
    const token = notification.metadata?.invitation_token;
    if (!token) {
      alert("Error: Token de invitación no encontrado");
      return;
    }

    try {
      setProcessingId(notification.id);
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Mark notification as read
        await markAsRead(notification.id);
        
        // Update local storage and redirect
        if (data.workspace_id) {
          localStorage.setItem('last_workspace_id', data.workspace_id);
          // Set as default workspace in Supabase
          await supabase.auth.updateUser({
            data: { default_workspace_id: data.workspace_id }
          });
        }
        
        // Redirect to dashboard
        window.location.href = "/dashboard"; // Force full reload to update workspace context
      } else {
        alert(data.error || "Error al aceptar la invitación");
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
      alert("Error inesperado al aceptar la invitación");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectInvitation = async (notification: Notification) => {
    const token = notification.metadata?.invitation_token;
    if (!token) return;

    if (!confirm("¿Estás seguro de que deseas rechazar esta invitación?")) return;

    try {
      setProcessingId(notification.id);
      const response = await fetch('/api/invitations/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        // Mark as read and maybe delete?
        await deleteNotification(notification.id);
      } else {
        alert("Error al rechazar la invitación");
      }
    } catch (error) {
      console.error("Error rejecting invitation:", error);
    } finally {
      setProcessingId(null);
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
        return 'border-red-500 text-red-600 dark:text-red-400';
      case 'high':
        return 'border-orange-500 text-orange-600 dark:text-orange-400';
      case 'low':
        return 'border-gray-500 text-gray-600 dark:text-gray-400';
      default:
        return 'border-blue-500 text-blue-600 dark:text-blue-400';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Notificaciones</h1>
        <p className="text-text-secondary">
          Gestiona todas tus notificaciones en un solo lugar
        </p>
      </div>

      {/* Actions Bar */}
      <div className="bg-card border border-border rounded-lg p-4 mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-hover-bg text-text-secondary hover:bg-hover-bg/80'
            }`}
          >
            Todas ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'unread'
                ? 'bg-primary text-white'
                : 'bg-hover-bg text-text-secondary hover:bg-hover-bg/80'
            }`}
          >
            No leídas ({notifications.filter(n => !n.read).length})
          </button>
        </div>
        
        {notifications.filter((n: Notification) => !n.read).length > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          >
            <HiCheckCircle className="w-5 h-5" />
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <HiBell className="w-16 h-16 mx-auto mb-4 text-text-tertiary opacity-50" />
            <p className="text-text-secondary text-lg">
              {filter === 'unread' ? 'No tienes notificaciones sin leer' : 'No tienes notificaciones'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification: Notification) => {
            const isInvitation = notification.type === 'invitation';
            const workspaceName = notification.metadata?.workspace_name || 'un espacio de trabajo';
            const isProcessing = processingId === notification.id;

            return (
              <div
                key={notification.id}
                className={`bg-card border rounded-lg p-4 transition-all ${
                  !notification.read
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border hover:border-border-hover'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 text-3xl">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-base font-semibold text-foreground">
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <div className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0 mt-1.5"></div>
                      )}
                    </div>
                    
                    <p className="text-sm text-text-secondary mb-3">
                      {notification.message}
                    </p>

                    {/* Special rendering for invitations */}
                    {isInvitation && (
                      <div className="mb-3 p-4 bg-background border border-border rounded-lg">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-text-tertiary">Espacio:</span>
                              <span className="font-bold text-foreground">{workspaceName}</span>
                            </div>
                            
                            {notification.metadata?.role_name && (
                               <div className="flex items-center gap-2 text-sm">
                                <span className="text-text-tertiary">Rol:</span>
                                <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{notification.metadata.role_name}</span>
                              </div>
                            )}
                          </div>

                          {notification.metadata?.modules && Array.isArray(notification.metadata.modules) && notification.metadata.modules.length > 0 && (
                             <div className="text-sm">
                                <span className="text-text-tertiary ml-1">Módulos:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {notification.metadata.modules.map((mod: string, idx: number) => (
                                    <span key={idx} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded text-xs border border-blue-100 dark:border-blue-800">
                                      {mod}
                                    </span>
                                  ))}
                                </div>
                             </div>
                          )}
                          
                          <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-border">
                            <button
                              onClick={() => handleRejectInvitation(notification)}
                              className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors flex items-center gap-1"
                              disabled={isProcessing}
                            >
                              <HiX className="w-3 h-3" />
                              Rechazar
                            </button>
                            <button
                              onClick={() => handleAcceptInvitation(notification)}
                              className="px-3 py-1.5 text-xs font-medium bg-primary text-white hover:bg-primary/90 rounded-md transition-colors flex items-center gap-1"
                              disabled={isProcessing}
                            >
                              {isProcessing ? (
                                <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span>
                              ) : (
                                <HiCheckCircle className="w-3 h-3" />
                              )}
                              Aceptar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-text-tertiary">
                      <span>{formatDistanceToNow(notification.created_at)}</span>
                      {notification.priority !== 'medium' && (
                        <span className={`px-2 py-1 rounded-full border ${getPriorityColor(notification.priority)}`}>
                          {notification.priority === 'urgent'
                            ? 'Urgente'
                            : notification.priority === 'high'
                            ? 'Alta'
                            : 'Baja'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!notification.read && !isInvitation && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
                        title="Marcar como leída"
                      >
                        <HiCheckCircle className="w-5 h-5 text-green-600" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Eliminar permanentemente"
                    >
                      <HiTrash className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
