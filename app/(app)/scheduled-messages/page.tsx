'use client';

import { useState, useEffect } from 'react';
import { HiPlus, HiClock } from 'react-icons/hi';
import type { ScheduledMessage } from '@/app/types/scheduled-messages';
import StatsCards from './StatsCards';
import MessagesList from './MessagesList';
import CreateMessageModal from './CreateMessageModal';

export default function ScheduledMessagesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch messages on mount
  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/scheduled-messages');
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      setMessages(data);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: any) => {
    try {
      const response = await fetch('/api/scheduled-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create scheduled message');
      }

      // Refresh messages list
      await fetchMessages();
      setShowCreateModal(false);
    } catch (err: any) {
      console.error('Error creating scheduled message:', err);
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este mensaje programado?')) {
      return;
    }

    try {
      const response = await fetch(`/api/scheduled-messages/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete message');
      }

      // Refresh messages list
      await fetchMessages();
    } catch (err: any) {
      console.error('Error deleting message:', err);
      alert(err.message);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas cancelar este mensaje programado?')) {
      return;
    }

    try {
      const response = await fetch(`/api/scheduled-messages/${id}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel message');
      }

      // Refresh messages list
      await fetchMessages();
    } catch (err: any) {
      console.error('Error cancelling message:', err);
      alert(err.message);
    }
  };

  const pendingCount = messages.filter(m => m.status === 'pending' || m.status === 'queued' || m.status === 'processing').length;
  const sentCount = messages.filter(m => m.status === 'sent').length;
  const failedCount = messages.filter(m => m.status === 'failed').length;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Mensajes Programados</h1>
          <p className="text-sm md:text-base text-text-secondary mt-1">
            Gestiona y monitorea tus mensajes programados
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium shadow-sm touch-manipulation"
        >
          <HiPlus className="w-5 h-5" />
          Nuevo Mensaje
        </button>
      </div>

      {/* Stats Cards */}
      <StatsCards
        pendingCount={pendingCount}
        sentCount={sentCount}
        failedCount={failedCount}
        totalCount={messages.length}
      />

      {/* Messages List */}
      <MessagesList
        messages={messages}
        loading={loading}
        onCreateClick={() => setShowCreateModal(true)}
        onDelete={handleDelete}
        onCancel={handleCancel}
        onRefresh={fetchMessages}
      />

      {/* Create Modal */}
      <CreateMessageModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}