'use client';

import { HiClock, HiPlus, HiRefresh } from 'react-icons/hi';
import type { ScheduledMessage } from '@/app/types/scheduled-messages';
import MessageItem from './MessageItem';

interface MessagesListProps {
  messages: ScheduledMessage[];
  loading?: boolean;
  onCreateClick: () => void;
  onDelete?: (id: string) => void;
  onCancel?: (id: string) => void;
  onRefresh?: () => void;
}

export default function MessagesList({
  messages,
  loading = false,
  onCreateClick,
  onDelete,
  onCancel,
  onRefresh,
}: MessagesListProps) {
  return (
    <div className="bg-background rounded-xl border border-current/20 overflow-hidden">
      <div className="p-4 border-b border-current/20 flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Mensajes Programados</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 hover:bg-hover-bg rounded-lg transition-colors disabled:opacity-50"
        >
          <HiRefresh className={`w-5 h-5 text-primary ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="divide-y divide-border">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-text-secondary">Cargando mensajes...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center">
            <HiClock className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <p className="text-text-secondary mb-4">No hay mensajes programados</p>
            <button
              onClick={onCreateClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <HiPlus className="w-5 h-5" />
              Crear Primer Mensaje
            </button>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              onDelete={onDelete}
              onCancel={onCancel}
            />
          ))
        )}
      </div>
    </div>
  );
}