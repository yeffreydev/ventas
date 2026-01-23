'use client';

import { HiBell } from 'react-icons/hi';

/**
 * Lightweight NotificationBell - notifications disabled for performance optimization
 */
export function NotificationBell() {
  return (
    <button
      className="relative p-2 hover:bg-hover-bg rounded-lg transition-colors opacity-50 cursor-not-allowed"
      aria-label="Notifications (disabled)"
      disabled
      title="Notificaciones deshabilitadas temporalmente"
    >
      <HiBell className="w-6 h-6 text-foreground" />
    </button>
  );
}