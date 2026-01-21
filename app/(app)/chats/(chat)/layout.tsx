'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { HiSearch, HiRefresh, HiAdjustments, HiX, HiTag, HiClock, HiUserGroup } from 'react-icons/hi';
import { BiPlayCircle } from 'react-icons/bi';
import { SiWhatsapp, SiTelegram, SiFacebook, SiInstagram, SiX } from 'react-icons/si';
import { HiMail, HiPhone } from 'react-icons/hi';
import { Badge, Spinner, Select } from 'flowbite-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWorkspace } from '../../../providers/WorkspaceProvider';
import {
  getConversations,
  getInboxes,
  ChatwootConversation,
  ChatwootInbox
} from './chat/api-client';
import { chatCache } from './chat/utils/indexedDBCache';
import { useRealtimeChat, RealtimeEvent } from '@/app/hooks/useRealtimeChat';

export default function ChatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { currentWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'open' | 'resolved'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<ChatwootConversation[]>([]);
  const [inboxes, setInboxes] = useState<ChatwootInbox[]>([]);
  const [selectedInbox, setSelectedInbox] = useState<number | null>(() => {
    // Load last selected inbox from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lastSelectedInbox');
      return saved ? parseInt(saved) : null;
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetchingConversations, setFetchingConversations] = useState(false);
  const [loadingInboxes, setLoadingInboxes] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Advanced filters state
  const [filters, setFilters] = useState({
    hasUnread: false,
    chatAge: 'all' as 'all' | 'today' | 'week' | 'month' | 'older',
    assignedTo: 'all' as 'all' | 'me' | 'unassigned' | 'others',
    labels: [] as string[],
    priority: 'all' as 'all' | 'high' | 'medium' | 'low',
  });

  // Fetch Chatwoot account ID from environment
  const [chatwootAccountId, setChatwootAccountId] = useState<number>(1);
  
  useEffect(() => {
    fetch('/api/config/chatwoot')
      .then(res => res.json())
      .then(data => setChatwootAccountId(data.accountId))
      .catch(err => console.error('Failed to fetch Chatwoot config:', err));
  }, []);

  // Load inboxes on mount
  useEffect(() => {
    loadInboxes();
  }, []);

  // Load conversations when tab or inbox changes
  useEffect(() => {
    loadConversations();
  }, [activeTab, selectedInbox]);

  // Save selected inbox to localStorage
  useEffect(() => {
    if (selectedInbox !== null) {
      localStorage.setItem('lastSelectedInbox', selectedInbox.toString());
    } else {
      localStorage.removeItem('lastSelectedInbox');
    }
  }, [selectedInbox]);

  const loadInboxes = async () => {
    if (!currentWorkspace?.id) return;

    setLoadingInboxes(true);
    try {
      const data = await getInboxes(currentWorkspace.id);
      setInboxes(data.inboxes || []);
    } catch (error) {
      console.error('Error loading inboxes:', error);
    } finally {
      setLoadingInboxes(false);
    }
  };

  const loadConversations = async () => {
    if (!currentWorkspace?.id) return;

    setLoading(true);
    try {
      // 1. Try to load from cache first for INSTANT display (workspace-specific)
      const cachedConversations = await chatCache.getCachedConversations(currentWorkspace.id);
      if (cachedConversations && cachedConversations.length > 0) {
        setConversations(cachedConversations);
        setLoading(false); // ✅ Show immediately - no blocking!
        setInitialLoad(false); // Cache loaded
      }

      // 2. Fetch fresh data in background
      setFetchingConversations(true);
      const data = await getConversations(activeTab, selectedInbox || undefined, currentWorkspace.id);
      const freshConversations = data.conversations || [];
      setConversations(freshConversations);

      // 3. Synchronize cache: add new chats + remove deleted chats
      await chatCache.syncConversations(freshConversations, currentWorkspace.id);
      
      // 4. Clear cache from other workspaces (optional, for cleaner cache)
      await chatCache.clearOtherWorkspaces(currentWorkspace.id);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
      setInitialLoad(false);
      setFetchingConversations(false);
    }
  };

  // Extract the active conversation ID from the URL
  const activeConversationId = useMemo(() => {
    const match = pathname.match(/conversation=(\d+)/);
    return match ? parseInt(match[1]) : undefined;
  }, [pathname]);

  // Get inbox IDs for SSE connection
  const inboxIds = useMemo(() => inboxes.map(inbox => inbox.id), [inboxes]);

  // SSE Real-time connection for conversation list updates
  useRealtimeChat({
    accountId: chatwootAccountId,
    inboxIds,
    activeConversationId,
    onMessageCreated: useCallback((event: RealtimeEvent) => {
      if (!event?.data?.message) return;
      const message = event.data.message;
      
      console.log(`🔔 [LAYOUT] Message ${message.message_type === 0 ? 'received' : 'sent'} for conversation ${event.conversationId}`);
      
      setConversations(prev => {
        // Check if conversation exists
        const conversationExists = prev.some(c => c.id === event.conversationId);
        
        if (!conversationExists) {
          console.warn('⚠️ [LAYOUT] Conversation not found, reloading...');
          loadConversations();
          return prev;
        }
        
        // Update the conversation
        const updated = prev.map(conv => {
          if (conv.id === event.conversationId) {
            const isIncoming = message.message_type === 0;
            const isActiveChat = event.conversationId === activeConversationId;
            
            // Calculate new unread count:
            // - For incoming messages to ACTIVE chat: set to 0 (user is viewing)  
            // - For incoming messages to NON-active chat: increment
            // - For outgoing messages to ACTIVE chat: set to 0 (you sent it, so you read it)
            // - For outgoing messages to NON-active chat: set to 0 (you engaged with it)
            let newUnreadCount = conv.unread_count || 0;
            if (isIncoming) {
              // Incoming message
              newUnreadCount = isActiveChat ? 0 : newUnreadCount + 1;
            } else {
              // Outgoing message - always reset to 0 (you engaged with the conversation)
              newUnreadCount = 0;
            }
            
            return {
              ...conv,
              unread_count: newUnreadCount,
              last_non_activity_message: {
                content: message.content,
                created_at: message.created_at,
              },
              timestamp: message.created_at,
            };
          }
          return conv;
        });
        
        // Sort by timestamp (newest first)
        return updated.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      });
    }, [activeConversationId, loadConversations]),
    onConversationCreated: useCallback((event: RealtimeEvent) => {
      const newConversation = event.data?.conversation || event.data;
      if (!newConversation || !newConversation.id) return;
      setConversations(prev => {
        const exists = prev.some(conv => conv.id === newConversation.id);
        if (exists) return prev;
        return [newConversation, ...prev].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      });
    }, []),
    onConversationUpdated: useCallback((event: RealtimeEvent) => {
      setConversations(prev => prev.map(conv =>
        conv.id === event.conversationId ? { ...conv, ...event.data.conversation } : conv
      ));
    }, []),
    onConversationStatusChanged: useCallback((event: RealtimeEvent) => {
      setConversations(prev => prev.map(conv =>
        conv.id === event.conversationId ? { ...conv, status: event.data.status } : conv
      ));
    }, []),
  });

  const filteredConversations = conversations.filter(conv => {
    // Search filter
    const matchesSearch = conv.meta?.sender?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.meta?.sender?.phone_number?.includes(searchQuery);
    
    if (!matchesSearch) return false;

    // Unread filter
    if (filters.hasUnread && conv.unread_count === 0) return false;

    // Chat age filter
    if (filters.chatAge !== 'all') {
      const now = Date.now() / 1000;
      const age = now - conv.timestamp;
      const day = 86400; // seconds in a day

      switch (filters.chatAge) {
        case 'today':
          if (age > day) return false;
          break;
        case 'week':
          if (age > day * 7) return false;
          break;
        case 'month':
          if (age > day * 30) return false;
          break;
        case 'older':
          if (age <= day * 30) return false;
          break;
      }
    }

    return true;
  });

  const resetFilters = () => {
    setFilters({
      hasUnread: false,
      chatAge: 'all',
      assignedTo: 'all',
      labels: [],
      priority: 'all',
    });
  };

  const hasActiveFilters = filters.hasUnread ||
    filters.chatAge !== 'all' ||
    filters.assignedTo !== 'all' ||
    filters.labels.length > 0 ||
    filters.priority !== 'all';

  const unreadCount = conversations.filter(c => c.unread_count > 0).length;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
    }
  };

  // Get channel icon based on channel type
  const getChannelIcon = (channel: string) => {
    const channelLower = channel?.toLowerCase() || '';
    
    if (channelLower.includes('whatsapp') || channelLower === 'Channel::Whatsapp'.toLowerCase()) {
      return <SiWhatsapp className="w-4 h-4 text-green-500" />;
    } else if (channelLower.includes('telegram')) {
      return <SiTelegram className="w-4 h-4 text-blue-400" />;
    } else if (channelLower.includes('facebook') || channelLower.includes('messenger')) {
      return <SiFacebook className="w-4 h-4 text-blue-600" />;
    } else if (channelLower.includes('instagram')) {
      return <SiInstagram className="w-4 h-4 text-pink-500" />;
    } else if (channelLower.includes('twitter') || channelLower.includes('x')) {
      return <SiX className="w-4 h-4 text-gray-900 dark:text-white" />;
    } else if (channelLower.includes('email')) {
      return <HiMail className="w-4 h-4 text-gray-500" />;
    } else if (channelLower.includes('sms') || channelLower.includes('twilio')) {
      return <HiPhone className="w-4 h-4 text-purple-500" />;
    }
    
    // Default icon for unknown channels
    return <HiUserGroup className="w-4 h-4 text-gray-400" />;
  };

  // Helper function to get customer stage label and color
  const getCustomerStageInfo = (stage: string) => {
    const stageConfig: Record<string, { label: string; color: string; bgColor: string }> = {
      lead: { label: 'Prospecto Inicial', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
      prospect: { label: 'Prospecto', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
      customer: { label: 'Cliente', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
      negotiation: { label: 'Negociación', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
      inactive: { label: 'Inactivo', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900/30' },
      qualified: { label: 'Calificado', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
      lost: { label: 'Perdido', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' }
    };
    return stageConfig[stage] || { label: stage, color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900/30' };
  };

  return (
    <div className="flex h-full min-h-0">
      {/* Left Sidebar - Chat List */}
      <div className="w-80 border-r border-current/20 flex flex-col shrink-0">
        {/* Search Bar */}
        <div className="p-4 border-b border-current/20">
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input-border bg-input-bg text-foreground placeholder-text-tertiary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
            />
          </div>
          
          {/* Inbox Filter */}
          <div className="mt-3">
            <Select
              value={selectedInbox?.toString() || ''}
              onChange={(e) => setSelectedInbox(e.target.value ? parseInt(e.target.value) : null)}
              disabled={loadingInboxes}
              sizing="sm"
            >
              <option value="">Todos los canales</option>
              {inboxes.map((inbox) => (
                <option key={inbox.id} value={inbox.id}>
                  {inbox.name} ({inbox.channel_type})
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Link
              href="/chats/reminders"
              className="flex-1 px-3 py-2 border border-current/20 rounded-lg hover:bg-hover-bg transition-colors flex items-center justify-center gap-2 text-sm font-medium text-foreground"
            >
              <HiClock className="w-4 h-4 text-primary" />
              <span>Recordatorios</span>
            </Link>
            <button 
              onClick={loadConversations}
              className="p-2 border border-current/20 rounded-lg hover:bg-hover-bg transition-colors"
              disabled={loading}
            >
              <HiRefresh className={`w-5 h-5 text-primary ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-2 border rounded-lg transition-colors relative ${
                showAdvancedFilters || hasActiveFilters
                  ? 'border-primary bg-primary/10'
                  : 'border-current/20 hover:bg-hover-bg'
              }`}
            >
              <HiAdjustments className={`w-5 h-5 ${
                showAdvancedFilters || hasActiveFilters ? 'text-primary' : 'text-primary'
              }`} />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-card"></span>
              )}
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="p-4 border-b border-current/20 bg-hover-bg space-y-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Filtros Avanzados</h3>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-primary hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {/* Unread Only */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasUnread}
                onChange={(e) => setFilters({ ...filters, hasUnread: e.target.checked })}
                className="w-4 h-4 text-primary border-input-border rounded focus:ring-primary"
              />
              <span className="text-sm text-foreground">Solo no leídos</span>
            </label>

            {/* Chat Age */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">
                Antigüedad del Chat
              </label>
              <select
                value={filters.chatAge}
                onChange={(e) => setFilters({ ...filters, chatAge: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              >
                <option value="all">Todos</option>
                <option value="today">Hoy</option>
                <option value="week">Última semana</option>
                <option value="month">Último mes</option>
                <option value="older">Más antiguos</option>
              </select>
            </div>

            {/* Assigned To */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">
                Asignado a
              </label>
              <select
                value={filters.assignedTo}
                onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              >
                <option value="all">Todos</option>
                <option value="me">Asignados a mí</option>
                <option value="unassigned">Sin asignar</option>
                <option value="others">Otros agentes</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">
                Prioridad
              </label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              >
                <option value="all">Todas</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>

            {/* Labels */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">
                Etiquetas
              </label>
              <div className="flex flex-wrap gap-2">
                {['Urgente', 'Seguimiento', 'Venta', 'Soporte'].map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setFilters({
                        ...filters,
                        labels: filters.labels.includes(label)
                          ? filters.labels.filter(l => l !== label)
                          : [...filters.labels, label]
                      });
                    }}
                    className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                      filters.labels.includes(label)
                        ? 'bg-primary text-white'
                        : 'bg-background border border-current/20 text-foreground hover:border-primary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
              <div className="pt-3 border-t border-current/20">
                <p className="text-xs text-text-secondary mb-2">Filtros activos:</p>
                <div className="flex flex-wrap gap-2">
                  {filters.hasUnread && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                      No leídos
                      <button onClick={() => setFilters({ ...filters, hasUnread: false })}>
                        <HiX className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filters.chatAge !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                      {filters.chatAge === 'today' ? 'Hoy' : filters.chatAge === 'week' ? 'Semana' : filters.chatAge === 'month' ? 'Mes' : 'Antiguos'}
                      <button onClick={() => setFilters({ ...filters, chatAge: 'all' })}>
                        <HiX className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filters.assignedTo !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                      {filters.assignedTo === 'me' ? 'Míos' : filters.assignedTo === 'unassigned' ? 'Sin asignar' : 'Otros'}
                      <button onClick={() => setFilters({ ...filters, assignedTo: 'all' })}>
                        <HiX className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filters.priority !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                      Prioridad: {filters.priority}
                      <button onClick={() => setFilters({ ...filters, priority: 'all' })}>
                        <HiX className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filters.labels.map((label) => (
                    <span key={label} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                      {label}
                      <button onClick={() => setFilters({ ...filters, labels: filters.labels.filter(l => l !== label) })}>
                        <HiX className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-current/20">
          <button
            onClick={() => setActiveTab('open')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'open'
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-secondary hover:text-foreground'
            }`}
          >
            Abiertos
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'resolved'
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-secondary hover:text-foreground'
            }`}
          >
            Resueltos
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto relative">
          {/* Minimalist loading indicator during background fetch */}
          {fetchingConversations && filteredConversations.length > 0 && (
            <div className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm rounded-full p-1.5 shadow-sm">
              <Spinner size="sm" />
            </div>
          )}

          {initialLoad && filteredConversations.length === 0 ? (
            /* Initial loading - minimalist */
            <div className="flex justify-center items-center h-32">
              <Spinner size="md" />
            </div>
          ) : loading && filteredConversations.length === 0 ? (
            /* Loading after initial */
            <div className="flex justify-center items-center h-32">
              <Spinner size="lg" />
            </div>
          ) : filteredConversations.length === 0 ? (
            /* Empty state */
            <div className="p-4 text-center text-text-secondary">
              {selectedInbox ? (
                <>No hay conversaciones en este canal</>
              ) : (
                <>No hay conversaciones</>
              )}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = pathname.includes(`conversation=${conv.id}`);
              return (
                <Link
                  key={conv.id}
                  href={`/chats/chat?conversation=${conv.id}`}
                  className={`block p-4 border-b border-current/20 hover:bg-hover-bg transition-colors ${
                    isActive ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                        {conv.meta?.sender?.thumbnail ? (
                          <img
                            src={conv.meta.sender.thumbnail}
                            alt={conv.meta.sender.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          conv.meta?.sender?.name?.charAt(0)?.toUpperCase() || '?'
                        )}
                      </div>
                      {/* Channel Icon Badge */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-background rounded-full flex items-center justify-center border-2 border-background shadow-sm">
                        {getChannelIcon(conv.meta?.channel)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {conv.meta?.sender?.name || 'Sin nombre'}
                        </h3>
                        <span className="text-xs text-text-secondary shrink-0">
                          {formatDate(conv.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary truncate mt-1">
                        {conv.last_non_activity_message?.content || 'Sin mensajes'}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-text-tertiary">
                          {conv.meta?.sender?.phone_number || conv.meta?.sender?.email || ''}
                        </p>
                        {/* Customer Stage Badge */}
                        {conv.customer_link?.stage && (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getCustomerStageInfo(conv.customer_link.stage).bgColor} ${getCustomerStageInfo(conv.customer_link.stage).color}`}>
                            {getCustomerStageInfo(conv.customer_link.stage).label}
                          </span>
                        )}
                      </div>
                    </div>
                    {conv.unread_count > 0 && (
                      <Badge color="failure" className="rounded-full">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* Bottom Info */}
        <div className="p-4 border-t border-current/20 bg-hover-bg">
          <p className="text-xs text-text-secondary text-center mb-2">
            Total: {filteredConversations.length} conversaciones
          </p>
          {unreadCount > 0 && (
            <p className="text-xs text-primary text-center font-medium">
              {unreadCount} no leídas
            </p>
          )}
          <p className="text-xs text-text-tertiary text-center mt-3">
            ¿Te perdiste? Conoce más sobre cómo funciona la sección "Charlar"
          </p>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium shadow-lg shadow-primary/25">
            <span>Ver video</span>
            <BiPlayCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
<div className='h-full flex min-h-0  w-full overflow-auto'>

      {children}
    
</div>
    </div>
  );
}