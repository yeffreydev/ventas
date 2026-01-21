'use client';

import { useState } from 'react';
import { useNotifications } from '@/app/providers/NotificationProvider';
import type { NotificationType, NotificationPriority } from '@/app/types/notifications';

export default function TestNotificationsPage() {
  const {
    notifications,
    unreadCount,
    settings,
    permissionStatus,
    requestPermission,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateSettings,
    playNotificationSound,
    refreshNotifications,
  } = useNotifications();

  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    type: 'system' as NotificationType,
    title: 'Notificación de Prueba',
    message: 'Este es un mensaje de prueba del sistema de notificaciones',
    priority: 'medium' as NotificationPriority,
    action_url: '',
  });

  const notificationTypes: NotificationType[] = [
    'new_message',
    'new_conversation',
    'assignment',
    'reminder',
    'order_update',
    'system',
    'mention',
  ];

  const priorities: NotificationPriority[] = ['low', 'medium', 'high', 'urgent'];

  const createTestNotification = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('✅ Notificación creada exitosamente');
        await refreshNotifications();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      alert('❌ Error al crear notificación');
    } finally {
      setIsCreating(false);
    }
  };

  const createQuickNotification = async (type: NotificationType, priority: NotificationPriority) => {
    const titles: Record<NotificationType, string> = {
      new_message: 'Nuevo mensaje',
      new_conversation: 'Nueva conversación',
      assignment: 'Asignación de conversación',
      reminder: 'Recordatorio',
      order_update: 'Actualización de pedido',
      system: 'Notificación del sistema',
      mention: 'Te han mencionado',
      invitation: 'Nueva invitación'
    };

    const messages: Record<NotificationType, string> = {
      new_message: 'Tienes un nuevo mensaje de un cliente',
      new_conversation: 'Se ha iniciado una nueva conversación',
      assignment: 'Se te ha asignado una nueva conversación',
      reminder: 'Tienes una tarea pendiente',
      order_update: 'El pedido #12345 ha sido actualizado',
      system: 'El sistema se actualizará esta noche',
      mention: 'Juan te mencionó en un comentario',
      invitation: 'Has recibido una nueva invitación'
    };

    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title: titles[type],
          message: messages[type],
          priority,
        }),
      });
      await refreshNotifications();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-6">
        🔔 Panel de Prueba de Notificaciones
      </h1>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-background-bg p-4 rounded-lg border border-border">
          <h3 className="text-sm font-medium text-text-secondary mb-2">
            Notificaciones Sin Leer
          </h3>
          <p className="text-3xl font-bold text-foreground">{unreadCount}</p>
        </div>
        <div className="bg-background-bg p-4 rounded-lg border border-border">
          <h3 className="text-sm font-medium text-text-secondary mb-2">
            Total de Notificaciones
          </h3>
          <p className="text-3xl font-bold text-foreground">{notifications.length}</p>
        </div>
        <div className="bg-background-bg p-4 rounded-lg border border-border">
          <h3 className="text-sm font-medium text-text-secondary mb-2">
            Permiso del Navegador
          </h3>
          <p className="text-lg font-semibold text-foreground">
            {permissionStatus === 'granted' ? '✅ Concedido' : 
             permissionStatus === 'denied' ? '❌ Denegado' : 
             '⏳ Pendiente'}
          </p>
        </div>
      </div>

      {/* Permission Request */}
      {permissionStatus !== 'granted' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-foreground mb-2">
            Habilitar Notificaciones del Navegador
          </h3>
          <p className="text-sm text-text-secondary mb-3">
            Para recibir notificaciones incluso cuando no estés en la aplicación, habilita los permisos del navegador.
          </p>
          <button
            onClick={requestPermission}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Solicitar Permiso
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-background-bg p-6 rounded-lg border border-border mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Acciones Rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={playNotificationSound}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            🔊 Probar Sonido
          </button>
          <button
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✓ Marcar Todas como Leídas
          </button>
          <button
            onClick={refreshNotifications}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            🔄 Refrescar
          </button>
        </div>
      </div>

      {/* Quick Test Notifications */}
      <div className="bg-background-bg p-6 rounded-lg border border-border mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Crear Notificaciones de Prueba Rápidas
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {notificationTypes.map((type) => (
            <button
              key={type}
              onClick={() => createQuickNotification(type, 'medium')}
              className="bg-primary text-white px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm"
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <h3 className="text-sm font-medium text-foreground mb-2">Por Prioridad:</h3>
          <div className="flex flex-wrap gap-2">
            {priorities.map((priority) => (
              <button
                key={priority}
                onClick={() => createQuickNotification('system', priority)}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  priority === 'urgent' ? 'bg-red-600 text-white' :
                  priority === 'high' ? 'bg-orange-600 text-white' :
                  priority === 'medium' ? 'bg-blue-600 text-white' :
                  'bg-gray-600 text-white'
                }`}
              >
                {priority}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Notification Form */}
      <div className="bg-background-bg p-6 rounded-lg border border-border mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Crear Notificación Personalizada
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tipo
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as NotificationType })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-bg text-foreground"
            >
              {notificationTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Prioridad
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as NotificationPriority })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-bg text-foreground"
            >
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Título
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-bg text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Mensaje
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-bg text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              URL de Acción (opcional)
            </label>
            <input
              type="text"
              value={formData.action_url}
              onChange={(e) => setFormData({ ...formData, action_url: e.target.value })}
              placeholder="/dashboard"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-bg text-foreground"
            />
          </div>

          <button
            onClick={createTestNotification}
            disabled={isCreating}
            className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isCreating ? 'Creando...' : 'Crear Notificación'}
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-background-bg p-6 rounded-lg border border-border mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Configuración</h2>
        {settings && (
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => updateSettings({ enabled: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-foreground">Notificaciones habilitadas</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.sound_enabled}
                onChange={(e) => updateSettings({ sound_enabled: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-foreground">Sonido habilitado</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.browser_notifications}
                onChange={(e) => updateSettings({ browser_notifications: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-foreground">Notificaciones del navegador</span>
            </label>
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-background-bg p-6 rounded-lg border border-border">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Lista de Notificaciones ({notifications.length})
        </h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-text-secondary text-center py-8">
              No hay notificaciones. Crea una para probar el sistema.
            </p>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border ${
                  notification.read
                    ? 'bg-background border-border'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{notification.title}</h3>
                    <p className="text-sm text-text-secondary mt-1">{notification.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-text-tertiary">{notification.type}</span>
                      <span className="text-xs text-text-tertiary">•</span>
                      <span className="text-xs text-text-tertiary">{notification.priority}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-sm text-primary hover:text-primary/80"
                        title="Marcar como leída"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}