'use client';

import {
  HiCalendar,
  HiCheckCircle,
  HiPencil,
  HiTrash,
  HiX,
} from 'react-icons/hi';
import { SiWhatsapp } from 'react-icons/si';
import type { ScheduledMessage, MessageStatus } from '@/app/types/scheduled-messages';

interface MessageItemProps {
  message: ScheduledMessage;
  onDelete?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export default function MessageItem({ message, onDelete, onCancel }: MessageItemProps) {
  const getStatusBadge = (status: MessageStatus) => {
    const config: Record<MessageStatus, { color: string; label: string; icon: any }> = {
      pending: { color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400', label: 'Pendiente', icon: HiCalendar },
      queued: { color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', label: 'En cola', icon: HiCalendar },
      processing: { color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', label: 'Procesando', icon: HiCalendar },
      sent: { color: 'bg-green-500/10 text-green-600 dark:text-green-400', label: 'Enviado', icon: HiCheckCircle },
      failed: { color: 'bg-red-500/10 text-red-600 dark:text-red-400', label: 'Fallido', icon: HiCheckCircle },
      cancelled: { color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400', label: 'Cancelado', icon: HiCheckCircle },
    };

    const { color, label, icon: Icon } = config[status] || config.pending;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
    );
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return <SiWhatsapp className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="p-4 md:p-6 hover:bg-hover-bg transition-colors">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
            {getChannelIcon(message.channel)}
            <h3 className="font-semibold text-sm md:text-base text-foreground truncate">{message.customer_name}</h3>
            {getStatusBadge(message.status)}
          </div>
          <p className="text-xs md:text-sm text-text-secondary mb-2 md:mb-3 line-clamp-2">
            {message.message}
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-text-tertiary">
            <div className="flex items-center gap-1">
              <HiCalendar className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
              <span className="truncate">Programado: {formatDateTime(message.scheduled_at)}</span>
            </div>
            {message.sent_at && (
              <div className="flex items-center gap-1">
                <HiCheckCircle className="w-4 h-4" />
                <span>Enviado: {formatDateTime(message.sent_at)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex sm:flex-col items-center gap-2 shrink-0">
          {message.status === 'pending' && (
            <>
              <button
                onClick={() => onCancel?.(message.id)}
                className="p-2.5 md:p-2 hover:bg-hover-bg rounded-lg transition-colors touch-manipulation"
                title="Cancelar mensaje"
              >
                <HiX className="w-5 h-5 md:w-4 md:h-4 text-yellow-600 dark:text-yellow-400" />
              </button>
              <button
                onClick={() => onDelete?.(message.id)}
                className="p-2.5 md:p-2 hover:bg-hover-bg rounded-lg transition-colors touch-manipulation"
                title="Eliminar mensaje"
              >
                <HiTrash className="w-5 h-5 md:w-4 md:h-4 text-red-600 dark:text-red-400" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}