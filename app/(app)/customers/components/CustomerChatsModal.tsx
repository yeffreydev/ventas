'use client';

import { useState, useEffect } from 'react';
import { HiX, HiChat, HiCheckCircle, HiXCircle, HiPlus, HiChevronRight } from 'react-icons/hi';
import { chatReferenceService } from '@/app/lib/services/chat-references';
import type { ChatReferenceWithCustomer } from '@/app/types/chat-references';
import { getInboxes, getConversations } from '@/app/(app)/chats/(chat)/chat/api-client';
import type { ChatwootInbox, ChatwootConversation } from '@/app/(app)/chats/(chat)/chat/api-client';

interface CustomerChatsModalProps {
  customerId: string;
  customerName: string;
  onClose: () => void;
}

export default function CustomerChatsModal({
  customerId,
  customerName,
  onClose,
}: CustomerChatsModalProps) {
  const [chats, setChats] = useState<ChatReferenceWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [selectedInboxId, setSelectedInboxId] = useState<number | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState('');
  
  // Chatwoot data
  const [inboxes, setInboxes] = useState<ChatwootInbox[]>([]);
  const [conversations, setConversations] = useState<ChatwootConversation[]>([]);
  const [loadingInboxes, setLoadingInboxes] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);

  useEffect(() => {
    fetchCustomerChats();
    loadInboxes();
  }, [customerId]);

  const loadInboxes = async () => {
    try {
      setLoadingInboxes(true);
      const data = await getInboxes();
      setInboxes(data.inboxes || []);
    } catch (error) {
      console.error('Error loading inboxes:', error);
    } finally {
      setLoadingInboxes(false);
    }
  };

  const loadConversations = async (inboxId: number) => {
    try {
      setLoadingConversations(true);
      const data = await getConversations('open', inboxId);
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleInboxSelect = (inboxId: number) => {
    setSelectedInboxId(inboxId);
    setSelectedConversationId(null);
    loadConversations(inboxId);
  };

  const fetchCustomerChats = async () => {
    try {
      setLoading(true);
      const data = await chatReferenceService.getByCustomerId(customerId, true);
      setChats(data as ChatReferenceWithCustomer[]);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkChat = async () => {
    if (!selectedConversationId) {
      setError('Debes seleccionar una conversación');
      return;
    }

    try {
      setLinking(true);
      setError('');
      
      await chatReferenceService.linkConversationToCustomer(
        customerId,
        selectedConversationId,
        {
          inboxId: selectedInboxId || undefined,
          metadata: { linked_manually: true }
        }
      );

      setSelectedInboxId(null);
      setSelectedConversationId(null);
      setConversations([]);
      setShowLinkForm(false);
      await fetchCustomerChats();
    } catch (err: any) {
      setError(err.message || 'Error al vincular el chat');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkChat = async (chatId: string) => {
    if (!confirm('¿Estás seguro de que deseas desvincular este chat?')) {
      return;
    }

    try {
      await chatReferenceService.delete(chatId);
      await fetchCustomerChats();
    } catch (error) {
      console.error('Error unlinking chat:', error);
      alert('Error al desvincular el chat');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string; icon: any }> = {
      open: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', label: 'Abierto', icon: HiCheckCircle },
      resolved: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', label: 'Resuelto', icon: HiCheckCircle },
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Pendiente', icon: HiXCircle },
      snoozed: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400', label: 'Pospuesto', icon: HiXCircle },
    };

    const config = statusConfig[status] || statusConfig.open;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
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
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-current/20 bg-background">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-current/20 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <HiChat className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Chats del Cliente</h3>
              <p className="text-sm text-text-secondary mt-1">{customerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
          >
            <HiX className="w-6 h-6 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Link New Chat Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowLinkForm(!showLinkForm)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/25"
            >
              <HiPlus className="w-5 h-5" />
              Vincular Chat
            </button>
          </div>

          {/* Link Form */}
          {showLinkForm && (
            <div className="mb-6 p-4 bg-primary/5 border border-primary/30 rounded-lg space-y-4">
              <h4 className="font-semibold text-foreground">Vincular Chat</h4>
              <p className="text-sm text-text-secondary">Selecciona primero un inbox y luego una conversación</p>
              
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* Step 1: Select Inbox */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Paso 1: Selecciona un Inbox
                </label>
                {loadingInboxes ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : inboxes.length === 0 ? (
                  <p className="text-sm text-text-secondary">No hay inboxes disponibles</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {inboxes.map((inbox) => (
                      <button
                        key={inbox.id}
                        type="button"
                        onClick={() => handleInboxSelect(inbox.id)}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          selectedInboxId === inbox.id
                            ? 'border-primary bg-primary/10'
                            : 'border-current/20 hover:border-primary/50 hover:bg-hover-bg'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-foreground">{inbox.name}</p>
                            <p className="text-xs text-text-secondary mt-1">
                              {inbox.channel_type} {inbox.phone_number && `• ${inbox.phone_number}`}
                            </p>
                          </div>
                          {selectedInboxId === inbox.id && (
                            <HiCheckCircle className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 2: Select Conversation */}
              {selectedInboxId && (
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-3">
                    Paso 2: Selecciona una Conversación
                  </label>
                  {loadingConversations ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : conversations.length === 0 ? (
                    <p className="text-sm text-text-secondary">No hay conversaciones abiertas en este inbox</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                      {conversations.map((conv) => (
                        <button
                          key={conv.id}
                          type="button"
                          onClick={() => setSelectedConversationId(conv.id)}
                          className={`p-3 rounded-lg border-2 transition-all text-left ${
                            selectedConversationId === conv.id
                              ? 'border-primary bg-primary/10'
                              : 'border-current/20 hover:border-primary/50 hover:bg-hover-bg'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">
                                {conv.meta?.sender?.name || 'Sin nombre'}
                              </p>
                              <p className="text-xs text-text-secondary mt-1">
                                {conv.meta?.sender?.phone_number || conv.meta?.sender?.email || `ID: ${conv.id}`}
                              </p>
                              {conv.last_non_activity_message && (
                                <p className="text-xs text-text-tertiary mt-1 line-clamp-1">
                                  {conv.last_non_activity_message.content}
                                </p>
                              )}
                            </div>
                            {selectedConversationId === conv.id && (
                              <HiCheckCircle className="w-5 h-5 text-primary flex-shrink-0 ml-2" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleLinkChat}
                  disabled={linking || !selectedConversationId}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {linking ? 'Vinculando...' : 'Vincular Chat Seleccionado'}
                </button>
                <button
                  onClick={() => {
                    setShowLinkForm(false);
                    setError('');
                    setSelectedInboxId(null);
                    setSelectedConversationId(null);
                    setConversations([]);
                  }}
                  className="px-4 py-2 border border-current/20 rounded-lg hover:bg-hover-bg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Chats List */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-12">
              <HiChat className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
              <p className="text-text-secondary">
                Este cliente no tiene chats vinculados todavía
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className="bg-hover-bg border border-current/20 rounded-lg p-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <HiChat className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">
                          Conversación #{chat.chatwoot_conversation_id}
                        </h4>
                        <p className="text-xs text-text-secondary">
                          Inbox ID: {chat.chatwoot_inbox_id || 'N/A'}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(chat.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-text-secondary">Último mensaje:</span>
                      <p className="font-medium text-foreground">
                        {formatDate(chat.last_message_at)}
                      </p>
                    </div>
                    <div>
                      <span className="text-text-secondary">Creado:</span>
                      <p className="font-medium text-foreground">
                        {formatDate(chat.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUnlinkChat(chat.id)}
                      className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Desvincular
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t border-current/20 p-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 border border-current/20 rounded-lg hover:bg-hover-bg transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}