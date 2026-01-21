'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getConversations,
  getMessages,
  getInboxes,
  sendMessage,
  markMessagesAsRead,
  ChatwootConversation,
  ChatwootMessage,
} from '../api-client';
import { chatReferenceService } from '@/app/lib/services/chat-references';
import type { ChatReferenceWithCustomer } from '@/app/types/chat-references';
import type { OrderWithCustomer } from '@/app/types/orders';
import type { Reminder } from '@/app/types/reminders';
import type { ScheduledMessage } from '@/app/types/scheduled-messages';
import { usePollingChat } from '@/app/hooks/usePollingChat';
import { useRealtimeChat } from '@/app/hooks/useRealtimeChat';
import { chatCache } from '../utils/indexedDBCache';
import { useWorkspace } from '@/app/providers/WorkspaceProvider';
import { optimizeImages } from '../utils/imageOptimizer';

interface RealtimeEvent {
  event: string;
  accountId: number;
  inboxId?: number;
  conversationId?: number;
  data: any;
  timestamp?: number;
}

export function useChatLogic() {
  const searchParams = useSearchParams();
  const conversationIdParam = searchParams.get('conversation');
  const { currentWorkspace } = useWorkspace();
  
  // State
  const [selectedConversation, setSelectedConversation] = useState<number | null>(
    conversationIdParam ? parseInt(conversationIdParam) : null
  );
  const [conversations, setConversations] = useState<ChatwootConversation[]>([]);
  const [messages, setMessages] = useState<ChatwootMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [conversationNotFound, setConversationNotFound] = useState(false);
  const [fetchingMessages, setFetchingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showContactInfo, setShowContactInfo] = useState(true);
  const [chatReference, setChatReference] = useState<ChatReferenceWithCustomer | null>(null);
  const [loadingChatReference, setLoadingChatReference] = useState(false);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [availableCustomers, setAvailableCustomers] = useState<any[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [selectedCustomerToLink, setSelectedCustomerToLink] = useState<any | null>(null);
  const [showLinkConfirmation, setShowLinkConfirmation] = useState(false);
  const [customerTags, setCustomerTags] = useState<any[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [customerAttributes, setCustomerAttributes] = useState<any[]>([]);
  const [customerAttributeDefinitions, setCustomerAttributeDefinitions] = useState<any[]>([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [customerNotes, setCustomerNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [customerActivities, setCustomerActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [showAttributeForm, setShowAttributeForm] = useState(false);
  const [newAttributeName, setNewAttributeName] = useState('');
  const [newAttributeValue, setNewAttributeValue] = useState('');
  const [newAttributeType, setNewAttributeType] = useState<'text' | 'number' | 'select' | 'date' | 'checkbox'>('text');
  const [newAttributeOptions, setNewAttributeOptions] = useState('');
  const [editingAttributeId, setEditingAttributeId] = useState<string | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<OrderWithCustomer[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [inboxes, setInboxes] = useState<any[]>([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderMessageContext, setReminderMessageContext] = useState<ChatwootMessage | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showCustomerDetailModal, setShowCustomerDetailModal] = useState(false);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [loadingScheduledMessages, setLoadingScheduledMessages] = useState(false);
  const [showScheduledMessageModal, setShowScheduledMessageModal] = useState(false);
  
  // Fetch Chatwoot account ID from environment
  const [chatwootAccountId, setChatwootAccountId] = useState<number>(1);
  
  useEffect(() => {
    fetch('/api/config/chatwoot')
      .then(res => res.json())
      .then(data => setChatwootAccountId(data.accountId))
      .catch(err => console.error('Failed to fetch Chatwoot config:', err));
  }, []);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastReadMessageIdRef = useRef<number | null>(null);
  const hasScrolledToLastReadRef = useRef(false);
  const [initialScrollDone, setInitialScrollDone] = useState(false);

  // Update selected conversation when URL param changes
  useEffect(() => {
    if (conversationIdParam) {
      setSelectedConversation(parseInt(conversationIdParam));
      setInitialScrollDone(false); // Reset scroll state on conversation change
      hasScrolledToLastReadRef.current = false;
      setInitialLoad(true); // Start initial load
      setConversationNotFound(false); // Reset not found state
    } else {
      setInitialLoad(false); // No conversation selected, not loading
    }
  }, [conversationIdParam]);

  // Load messages and chat reference when conversation is selected
  useEffect(() => {
    if (selectedConversation && currentWorkspace) {
      loadMessages(selectedConversation);
      loadConversations();
      loadChatReference(selectedConversation);
    }
  }, [selectedConversation, currentWorkspace?.id]); // Use only workspace.id to prevent loop

  // Load available tags when workspace changes
  useEffect(() => {
    if (currentWorkspace?.id) {
      loadAvailableTags();
    }
  }, [currentWorkspace?.id]);

  // Load available customers and inboxes
  useEffect(() => {
    if (currentWorkspace) {
        loadCustomers();
        loadInboxes(); // Inboxes might need scoping later
    }
  }, [currentWorkspace]);

  const loadConversations = async () => {
    if (!currentWorkspace) return;
    try {
      // Try to load from cache first (workspace-specific)
      const cachedConversations = await chatCache.getCachedConversations(currentWorkspace.id);
      if (cachedConversations) {
        setConversations(cachedConversations);
      }

      // Fetch fresh data
      const data = await getConversations('open', undefined, currentWorkspace.id);
      const freshConversations = data.conversations || [];
      setConversations(freshConversations);
      
      // Synchronize cache
      await chatCache.syncConversations(freshConversations, currentWorkspace.id);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadMessages = async (conversationId: number) => {
    if (!currentWorkspace?.id) return;

    setLoadingMessages(true);
    try {
      // 1. Try to load from cache first for INSTANT display (workspace-validated)
      const cachedMessages = await chatCache.getCachedMessages(conversationId, currentWorkspace.id);
      if (cachedMessages && cachedMessages.length > 0) {
        // Sort messages by created_at timestamp to ensure correct order
        const sortedMessages = cachedMessages.sort((a: any, b: any) => a.created_at - b.created_at);
        setMessages(sortedMessages);
        setLoadingMessages(false); // ✅ Show immediately - no blocking!
        setInitialLoad(false); // Cache loaded, initial load done
      }

      // 2. Fetch fresh data in background
      setFetchingMessages(true);
      const data = await getMessages(conversationId, currentWorkspace.id);
      const freshMessages = data.messages || [];

      // Check if conversation exists
      if (!data.messages || data.messages.length === 0) {
        // Verify with conversations list if this conversation exists
        if (currentWorkspace) {
            const convData = await getConversations('open', undefined, currentWorkspace.id);
            const conversationExists = convData.conversations?.some((c: any) => c.id === conversationId);

            if (!conversationExists) {
              setConversationNotFound(true);
              setInitialLoad(false);
              return;
            }
        }
      }

      // Sort messages by created_at timestamp to ensure correct order
      const sortedFreshMessages = freshMessages.sort((a: any, b: any) => a.created_at - b.created_at);
      setMessages(sortedFreshMessages);
      
      // 3. Update cache with fresh data (include workspace_id)
      await chatCache.cacheMessages(conversationId, freshMessages, currentWorkspace.id);
      
      // 4. Auto-mark messages as read when opening conversation
      if (sortedFreshMessages.length > 0) {
        const lastMessage = sortedFreshMessages[sortedFreshMessages.length - 1];
        try {
          await markMessagesAsRead(conversationId, lastMessage.created_at, currentWorkspace.id);
          // Update local conversations list to reflect read status
          setConversations(prev => prev.map(conv => 
            conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
          ));
        } catch (err) {
          console.error('Error auto-marking messages as read:', err);
        }
      }
      
      // Reset scroll tracking
      isUserScrollingRef.current = false;
      hasScrolledToLastReadRef.current = false;
      lastReadMessageIdRef.current = null;
    } catch (error: any) {
      console.error('Error loading messages:', error);
      // If we get a 404 or similar, mark conversation as not found
      if (error.response?.status === 404 || error.message?.includes('not found')) {
        setConversationNotFound(true);
      }
    } finally {
      setLoadingMessages(false);
      setFetchingMessages(false);
      setInitialLoad(false);
    }
  };

  const loadInboxes = async () => {
    if (!currentWorkspace?.id) return;

    try {
      const data = await getInboxes(currentWorkspace.id);
      setInboxes(data.inboxes || []);
    } catch (error) {
      console.error('Error loading inboxes:', error);
    }
  };

  const loadChatReference = async (conversationId: number) => {
    setLoadingChatReference(true);
    try {
      // Chat Reference also needs to be compatible with workspace if the table has it?
      // Currently chat_references links conversation_id (int) to customer_id (uuid).
      // Assuming conversation_id is unique across chatwoot installation (which might span multiple workspaces? No, account_id scope).
      // For now, chatReferenceService likely relies on ID.
      const chatRef = await chatReferenceService.getByChatwootConversationId(conversationId, true);
      setChatReference(chatRef as ChatReferenceWithCustomer | null);
      
      if (chatRef && chatRef.customer_id) {
        loadCustomerTags(chatRef.customer_id);
        loadCustomerAttributes(chatRef.customer_id);
        loadCustomerAttributeDefinitions();
        loadCustomerOrders(chatRef.customer_id);
        loadReminders(chatRef.customer_id, conversationId);
        loadScheduledMessages(chatRef.customer_id);
        loadCustomerNotes(chatRef.customer_id);
        loadCustomerActivities(chatRef.customer_id);
      } else {
        setCustomerTags([]);
        setCustomerAttributes([]);
        setCustomerAttributeDefinitions([]);
        setCustomerOrders([]);
        setReminders([]);
        setScheduledMessages([]);
        setCustomerNotes([]);
        setCustomerActivities([]);
      }
    } catch (error: any) {
      console.error('Error loading chat reference:', error);
      setChatReference(null);
      setCustomerTags([]);
      setCustomerOrders([]);
    } finally {
      setLoadingChatReference(false);
    }
  };

  // Load all available tags
  const loadAvailableTags = async () => {
    if (!currentWorkspace?.id) return;

    try {
      const response = await fetch(`/api/tags?workspace_id=${currentWorkspace.id}`);
      if (response.ok) {
        const tags = await response.json(); // API returns array directly, not { tags }
        setAvailableTags(tags || []);
      }
    } catch (error) {
      console.error('Error loading available tags:', error);
    }
  };

  // Add tag to customer
  const handleAddTag = async (tagId: string) => {
    if (!chatReference?.customer_id || !currentWorkspace?.id) return;

    try {
      const supabase = await import('@/app/utils/supabase/client').then(m => m.createClient());
      
      const { error } = await supabase
        .from('customer_tags')
        .insert({
          customer_id: chatReference.customer_id,
          tag_id: tagId
        });

      if (!error) {
        await loadCustomerTags(chatReference.customer_id);
      } else {
        console.error('Error adding tag:', error);
      }
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };

  // Remove tag from customer
  const handleRemoveTag = async (tagId: string, tagName: string) => {
    if (!chatReference?.customer_id || !currentWorkspace?.id) return;

    try {
      const supabase = await import('@/app/utils/supabase/client').then(m => m.createClient());
      
      const { error } = await supabase
        .from('customer_tags')
        .delete()
        .eq('customer_id', chatReference.customer_id)
        .eq('tag_id', tagId);

      if (!error) {
        await loadCustomerTags(chatReference.customer_id);
      } else {
        console.error('Error removing tag:', error);
      }
    } catch (error) {
      console.error('Error removing tag:', error);
    }  };

  const loadCustomerOrders = async (customerId: string) => {
    if (!currentWorkspace) return;
    setLoadingOrders(true);
    try {
      const response = await fetch(`/api/orders?customer_id=${customerId}&workspace_id=${currentWorkspace.id}`);
      if (response.ok) {
        const data = await response.json();
        setCustomerOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error loading customer orders:', error);
      setCustomerOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadCustomerTags = async (customerId: string) => {
    setLoadingTags(true);
    try {
      // Tags also should be scoped?
      const response = await fetch(`/api/customers/${customerId}${currentWorkspace ? `?workspace_id=${currentWorkspace.id}` : ''}`);
      if (response.ok) {
        const customer = await response.json();
        const tags = customer.customer_tags?.map((ct: any) => ct.tags).filter(Boolean) || [];
        setCustomerTags(tags);
      }
    } catch (error) {
      console.error('Error loading customer tags:', error);
      setCustomerTags([]);
    } finally {
      setLoadingTags(false);
    }
  };

  const loadCustomerAttributes = async (customerId: string) => {
    if (!currentWorkspace) return;
    setLoadingAttributes(true);
    try {
      const response = await fetch(`/api/customer-attributes?customer_id=${customerId}&workspace_id=${currentWorkspace.id}`);
      if (response.ok) {
        const data = await response.json();
        setCustomerAttributes(data);
      }
    } catch (error) {
      console.error('Error loading customer attributes:', error);
      setCustomerAttributes([]);
    } finally {
      setLoadingAttributes(false);
    }
  };

  const loadCustomerAttributeDefinitions = async () => {
    try {
      const response = await fetch('/api/customer-attribute-definitions');
      if (response.ok) {
        const data = await response.json();
        setCustomerAttributeDefinitions(data);
      }
    } catch (error) {
      console.error('Error loading attribute definitions:', error);
    }
  };

  const loadCustomerNotes = async (customerId: string) => {
    if (!currentWorkspace) return;
    setLoadingNotes(true);
    try {
      const response = await fetch(`/api/customer-notes?customer_id=${customerId}&workspace_id=${currentWorkspace.id}`);
      if (response.ok) {
        const data = await response.json();
        setCustomerNotes(data);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      setCustomerNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  };

  const loadCustomerActivities = async (customerId: string) => {
    if (!currentWorkspace) return;
    setLoadingActivities(true);
    try {
      const response = await fetch(`/api/customer-activities?customer_id=${customerId}&workspace_id=${currentWorkspace.id}`);
      if (response.ok) {
        const data = await response.json();
        setCustomerActivities(data);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
      setCustomerActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  };

  const loadCustomers = async () => {
    if (!currentWorkspace) return;
    try {
      const response = await fetch(`/api/customers?workspace_id=${currentWorkspace.id}`);
      const data = await response.json();
      setAvailableCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadReminders = async (customerId?: string, conversationId?: number) => {
    setLoadingReminders(true);
    try {
      const params = new URLSearchParams();
      if (customerId) params.append('customer_id', customerId);
      if (conversationId) params.append('conversation_id', conversationId.toString());
      if (currentWorkspace) params.append('workspace_id', currentWorkspace.id);
      
      const response = await fetch(`/api/reminders?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setReminders(data.reminders || []);
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
      setReminders([]);
    } finally {
      setLoadingReminders(false);
    }
  };

  const loadScheduledMessages = async (customerId: string) => {
    setLoadingScheduledMessages(true);
    try {
      const response = await fetch(`/api/scheduled-messages?customer_id=${customerId}`);
      if (response.ok) {
        const data = await response.json();
        setScheduledMessages(data || []);
      }
    } catch (error) {
      console.error('Error loading scheduled messages:', error);
      setScheduledMessages([]);
    } finally {
      setLoadingScheduledMessages(false);
    }
  };

  // Scroll management
  const isAtBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    const threshold = 100;
    const position = container.scrollHeight - container.scrollTop - container.clientHeight;
    return position < threshold;
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  };

  const handleScroll = () => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    isUserScrollingRef.current = true;
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 150);
  };

  // Scroll effects
  useEffect(() => {
    if (messages.length > 0 && !loadingMessages && !hasScrolledToLastReadRef.current) {
      hasScrolledToLastReadRef.current = true;
      // Use requestAnimationFrame to ensure DOM is ready but before paint if possible
      requestAnimationFrame(() => {
        scrollToBottom('instant');
        // Small delay to ensure scroll happened before showing content
        requestAnimationFrame(() => {
          setInitialScrollDone(true);
        });
      });
    } else if (messages.length === 0 && !loadingMessages) {
      // If no messages, we are "done" scrolling
      setInitialScrollDone(true);
    }
  }, [loadingMessages, messages.length]);

  useEffect(() => {
    if (messages.length > 0 && !loadingMessages && hasScrolledToLastReadRef.current) {
      if (isAtBottom() || !isUserScrollingRef.current) {
        setTimeout(() => scrollToBottom('smooth'), 150);
      }
    }
  }, [messages.length]);

  // Setup IntersectionObserver
  useEffect(() => {
    if (!selectedConversation) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = parseInt(entry.target.getAttribute('data-message-id') || '0');
            const messageTimestamp = parseInt(entry.target.getAttribute('data-message-timestamp') || '0');
            
            if (messageId && messageTimestamp && currentWorkspace?.id) {
              markMessagesAsRead(selectedConversation, messageTimestamp, currentWorkspace.id).catch(err => {
                console.error('Error marking messages as read:', err);
              });
            }
          }
        });
      },
      {
        root: messagesContainerRef.current,
        threshold: 0.5,
      }
    );

    messageRefs.current.forEach((element) => {
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [selectedConversation, messages]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Handlers
  const handleAddAttribute = async () => {
    if (!chatReference || !newAttributeName.trim()) {
      alert('El nombre del atributo es requerido');
      return;
    }

    // Validate value based on type
    if (newAttributeType !== 'checkbox' && !newAttributeValue.trim()) {
      alert('El valor del atributo es requerido');
      return;
    }

    // For select type, require options
    if (newAttributeType === 'select' && !newAttributeOptions.trim()) {
      alert('Las opciones son requeridas para tipo Selección');
      return;
    }

    try {
      // Encode type info in the value as JSON
      const options = newAttributeType === 'select' 
        ? newAttributeOptions.split(',').map(o => o.trim()).filter(Boolean)
        : undefined;
      
      const storedValue = JSON.stringify({
        _type: newAttributeType,
        _value: newAttributeType === 'checkbox' ? (newAttributeValue === 'true' ? 'true' : 'false') : newAttributeValue.trim(),
        _options: options
      });

      const response = await fetch('/api/customer-attributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: chatReference.customer_id,
          attribute_name: newAttributeName.trim(),
          attribute_value: storedValue,
          workspace_id: currentWorkspace?.id
        })
      });

      if (response.ok) {
        setNewAttributeName('');
        setNewAttributeValue('');
        setNewAttributeType('text');
        setNewAttributeOptions('');
        setShowAttributeForm(false);
        await loadCustomerAttributes(chatReference.customer_id);
      } else {
        const data = await response.json();
        alert(data.error || 'Error al crear el atributo');
      }
    } catch (error) {
      console.error('Error adding attribute:', error);
      alert('Error al crear el atributo');
    }
  };

  const handleUpdateAttribute = async (id: string, name: string, value: string) => {
    try {
      const response = await fetch('/api/customer-attributes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, attribute_name: name, attribute_value: value })
      });

      if (response.ok && chatReference) {
        setEditingAttributeId(null);
        await loadCustomerAttributes(chatReference.customer_id);
      } else {
        const data = await response.json();
        alert(data.error || 'Error al actualizar el atributo');
      }
    } catch (error) {
      console.error('Error updating attribute:', error);
      alert('Error al actualizar el atributo');
    }
  };

  const handleDeleteAttribute = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este atributo?')) return;

    try {
      const response = await fetch(`/api/customer-attributes?id=${id}`, { method: 'DELETE' });
      if (response.ok && chatReference) {
        await loadCustomerAttributes(chatReference.customer_id);
      } else {
        alert('Error al eliminar el atributo');
      }
    } catch (error) {
      console.error('Error deleting attribute:', error);
      alert('Error al eliminar el atributo');
    }
  };

  const handleAddNote = async (content: string) => {
    if (!chatReference || !content.trim()) return;

    try {
      const response = await fetch('/api/customer-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: chatReference.customer_id,
          content: content.trim(),
          workspace_id: currentWorkspace?.id
        })
      });

      if (response.ok) {
        await loadCustomerNotes(chatReference.customer_id);
      } else {
        alert('Error al crear la nota');
      }
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Error al crear la nota');
    }
  };

  const handleDeleteNote = async (id: string) => {
     if (!confirm('¿Estás seguro de eliminar esta nota?')) return;
     try {
       const response = await fetch(`/api/customer-notes?id=${id}`, { method: 'DELETE' });
       if (response.ok && chatReference) {
         await loadCustomerNotes(chatReference.customer_id);
       } else {
         alert('Error al eliminar la nota');
       }
     } catch (error) {
       console.error('Error deleting note:', error);
       alert('Error al eliminar la nota');
     }
  };

  const handleSelectCustomerToLink = (customer: any) => {
    setSelectedCustomerToLink(customer);
    setShowLinkConfirmation(true);
  };

  const handleConfirmLinkCustomer = async () => {
    if (!selectedConversation || !selectedCustomerToLink) return;
    
    try {
      await chatReferenceService.linkConversationToCustomer(
        selectedCustomerToLink.id,
        selectedConversation,
        { metadata: { linked_from_chat: true } }
      );
      await loadChatReference(selectedConversation);
      setShowCustomerSelector(false);
      setShowLinkConfirmation(false);
      setSelectedCustomerToLink(null);
      setCustomerSearchTerm('');
    } catch (error) {
      console.error('Error linking customer:', error);
      alert('Error al vincular el cliente');
    }
  };

  const handleCancelLinkCustomer = () => {
    setShowLinkConfirmation(false);
    setSelectedCustomerToLink(null);
  };

  const handleUnlinkCustomer = async () => {
    if (!selectedConversation || !chatReference) return;
    
    try {
      await chatReferenceService.delete(chatReference.id);
      setChatReference(null);
    } catch (error) {
      console.error('Error unlinking customer:', error);
      alert('Error al desvincular el cliente');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const validFiles: File[] = [];
      const maxFileSize = 10 * 1024 * 1024; // 10MB limit
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/aac',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
      ];

      for (const file of Array.from(files)) {
        if (file.size > maxFileSize) {
          alert(`El archivo "${file.name}" es demasiado grande. El límite es 10MB.`);
          continue;
        }

        if (!allowedTypes.some(type => file.type.startsWith(type.split('/')[0] + '/') || file.type === type)) {
          alert(`El tipo de archivo "${file.name}" no está permitido.`);
          continue;
        }

        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        // Optimize images before adding to selectedFiles
        console.log('[FileSelect] Optimizing images...');
        const optimizedFiles = await optimizeImages(validFiles);
        setSelectedFiles(prev => [...prev, ...optimizedFiles]);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageInput.trim() && selectedFiles.length === 0) || !selectedConversation || !currentWorkspace?.id) return;

    const tempId = `temp-${Date.now()}`;
    const messageContent = messageInput.trim();
    const filesToSend = [...selectedFiles];
    
    // Create optimistic message
    const optimisticMessage: ChatwootMessage = {
      id: Date.now(), // Temporary ID
      content: messageContent,
      message_type: 1, // outgoing
      created_at: Math.floor(Date.now() / 1000),
      conversation_id: selectedConversation,
      sender: undefined,
      attachments: filesToSend.map(file => ({
        file_type: file.type.startsWith('image/') ? 'image' : 'file',
        data_url: URL.createObjectURL(file),
      })),
      // @ts-ignore - Add custom property for tracking
      tempId,
      sending: true,
    };

    // Immediately add to UI
    setMessages(prev => [...prev, optimisticMessage]);
    setMessageInput('');
    setSelectedFiles([]);
    
    // Add to cache
    await chatCache.addOptimisticMessage(selectedConversation, optimisticMessage, currentWorkspace.id);
    
    // Scroll to bottom immediately
    setTimeout(() => scrollToBottom('smooth'), 100);

    try {
    // Log detailed file information before sending
    if (filesToSend.length > 0) {
      console.log('[SendMessage] Sending files:', filesToSend.map(f => ({
        name: f.name,
        type: f.type,
        size: `${Math.round(f.size / 1024)}KB`
      })));
    }
    
    // Send message in background
    const response = await sendMessage(
      selectedConversation,
      messageContent,
      filesToSend.length > 0 ? filesToSend : undefined,
      undefined,
      currentWorkspace?.id
    );
    
    // Update with real message (without reloading all messages)
    const realMessage = response.message || response;
    setMessages(prev => prev.map(msg =>
      // @ts-ignore
      msg.tempId === tempId ? realMessage : msg
    ));
    
    // Update cache with real message
    await chatCache.updateMessageStatus(selectedConversation, tempId, realMessage, currentWorkspace.id);
    
    // Update cache with all current messages (including the new one)
    const updatedMessages = await getMessages(selectedConversation, currentWorkspace?.id);
    await chatCache.cacheMessages(selectedConversation, updatedMessages.messages || [], currentWorkspace.id);
  } catch (error: any) {
    console.error('[SendMessage] Error details:', {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
      files: filesToSend.map(f => ({ name: f.name, type: f.type, size: f.size }))
    });
    
    // Remove optimistic message on error
    setMessages(prev => prev.filter(msg =>
      // @ts-ignore
      msg.tempId !== tempId
    ));
    
    // Show detailed error message
    let errorMessage = 'Error al enviar el mensaje';
    
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message === 'Network Error') {
      errorMessage = 'Error de red. Verifica tu conexión a internet.';
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Timeout: El archivo es muy grande o la conexión es muy lenta.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Add file info to error if files present
    if (filesToSend.length > 0) {
      const fileInfo = filesToSend.map(f => `${f.name} (${Math.round(f.size/1024)}KB)`).join(', ');
      errorMessage += `\n\nArchivos: ${fileInfo}`;
    }
    
    alert(`❌ ${errorMessage}`);
  }
};

  const handleCreateReminderFromMessage = (message: ChatwootMessage) => {
    setReminderMessageContext(message);
    setShowReminderModal(true);
  };

  const handleCreateReminderFromInput = () => {
    setReminderMessageContext(null);
    setShowReminderModal(true);
  };

  const handleSaveReminder = async (reminderData: {
    title: string;
    description?: string;
    due_date?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  }) => {
    try {
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...reminderData,
          customer_id: chatReference?.customer_id,
          conversation_id: selectedConversation,
          created_from_message_id: reminderMessageContext?.id,
          workspace_id: currentWorkspace?.id // Add workspace context
        }),
      });

      if (response.ok) {
        // Reload reminders
        if (chatReference?.customer_id) {
          await loadReminders(chatReference.customer_id, selectedConversation || undefined);
        }
        setReminderMessageContext(null);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Error al crear el recordatorio');
      }
    } catch (error: any) {
      console.error('Error saving reminder:', error);
      throw error;
    }
  };

  const handleUpdateReminder = async (id: string, updates: any) => {
    try {
      const response = await fetch('/api/reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });

      if (response.ok && chatReference?.customer_id) {
        await loadReminders(chatReference.customer_id, selectedConversation || undefined);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar el recordatorio');
      }
    } catch (error: any) {
      console.error('Error updating reminder:', error);
      throw error;
    }
  };

  const handleDeleteReminder = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este recordatorio?')) return;

    try {
      const response = await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' });
      if (response.ok && chatReference?.customer_id) {
        await loadReminders(chatReference.customer_id, selectedConversation || undefined);
      } else {
        throw new Error('Error al eliminar el recordatorio');
      }
    } catch (error: any) {
      console.error('Error deleting reminder:', error);
      alert('Error al eliminar el recordatorio');
    }
  };

  const handleCreateScheduledMessage = async (formData: any) => {
    if (!chatReference?.customer_id) return;
    
    try {
      const response = await fetch('/api/scheduled-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          customer_id: chatReference.customer_id,
          target_type: 'single',
        }),
      });
      
      if (response.ok) {
        await loadScheduledMessages(chatReference.customer_id);
        setShowScheduledMessageModal(false);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear mensaje programado');
      }
    } catch (error: any) {
      console.error('Error creating scheduled message:', error);
      alert(error.message || 'Error al crear mensaje programado');
    }
  };

  const handleCancelScheduledMessage = async (id: string) => {
    if (!confirm('¿Estás seguro de cancelar este mensaje programado?')) return;
    
    try {
      const response = await fetch(`/api/scheduled-messages/${id}/cancel`, { method: 'POST' });
      if (response.ok && chatReference?.customer_id) {
        await loadScheduledMessages(chatReference.customer_id);
      } else {
        throw new Error('Error al cancelar el mensaje');
      }
    } catch (error: any) {
      console.error('Error canceling scheduled message:', error);
      alert('Error al cancelar el mensaje programado');
    }
  };

  const handleProductSelect = async (product: any, variant?: any) => {
    if (!selectedConversation || !currentWorkspace?.id) return;

    try {
      // Format product message
      const response = await fetch('/api/products/format-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, variant }),
      });

      if (!response.ok) {
        throw new Error('Error al formatear el producto');
      }

      const { message, imageUrl } = await response.json();

      // Download image if available
      let imageFile: File | undefined;
      if (imageUrl) {
        try {
          const imageResponse = await fetch(imageUrl);
          const imageBlob = await imageResponse.blob();
          const fileName = `product-${product.id}.${imageBlob.type.split('/')[1] || 'jpg'}`;
          imageFile = new File([imageBlob], fileName, { type: imageBlob.type });
        } catch (imgError) {
          console.error('Error downloading product image:', imgError);
          // Continue without image if download fails
        }
      }

      // Send the formatted product message with image
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: ChatwootMessage = {
        id: Date.now(),
        content: message,
        message_type: 1,
        created_at: Math.floor(Date.now() / 1000),
        conversation_id: selectedConversation,
        sender: undefined,
        attachments: imageFile ? [{
          file_type: 'image',
          data_url: URL.createObjectURL(imageFile),
        }] : [],
        // @ts-ignore
        tempId,
        sending: true,
      };

      setMessages(prev => [...prev, optimisticMessage]);
      await chatCache.addOptimisticMessage(selectedConversation, optimisticMessage, currentWorkspace.id);
      setTimeout(() => scrollToBottom('smooth'), 100);

      // Send message with image file
      const sendResponse = await sendMessage(
        selectedConversation,
        message,
        imageFile ? [imageFile] : undefined,
        undefined,
        currentWorkspace?.id
      );

      const realMessage = sendResponse.message || sendResponse;
      setMessages(prev => prev.map(msg =>
        // @ts-ignore
        msg.tempId === tempId ? realMessage : msg
      ));

      await chatCache.updateMessageStatus(selectedConversation, tempId, realMessage, currentWorkspace.id);
      const updatedMessages = await getMessages(selectedConversation, currentWorkspace?.id);
      await chatCache.cacheMessages(selectedConversation, updatedMessages.messages || [], currentWorkspace.id);
    } catch (error: any) {
      console.error('Error sending product:', error);
      alert('Error al enviar el producto');
    }
  };

  const inboxIds = useMemo(() => inboxes.map(inbox => inbox.id), [inboxes]);

  // Realtime SSE connection
  const { isConnected: isSSEConnected } = useRealtimeChat({
    accountId: chatwootAccountId,
    inboxIds,
    activeConversationId: selectedConversation || undefined,
    onMessageCreated: useCallback((event: RealtimeEvent) => {
      if (!event?.data?.message) return;
      const message = event.data.message;
      
      // ONLY update messages list for the active conversation
      // Conversation list updates are now handled by layout.tsx
      if (event.conversationId === selectedConversation) {
        console.log('💬 [useChatLogic] Adding message to active chat:', message.id);
        setMessages(prev => {
          const exists = prev.some(m => m.id === message.id);
          if (exists) return prev;
          // Insert message in correct sorted position by created_at
          const newMessages = [...prev, message];
          return newMessages.sort((a: any, b: any) => a.created_at - b.created_at);
        });
        // Add to cache to maintain order
        if (currentWorkspace?.id) {
          chatCache.addMessageToCache(event.conversationId, message, currentWorkspace.id);
        }
      }
    }, [selectedConversation, currentWorkspace?.id]),
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

  // Fallback polling
  const { isPolling } = usePollingChat({
    accountId: chatwootAccountId,
    activeConversationId: selectedConversation || undefined,
    enabled: !isSSEConnected,
    onMessageCreated: useCallback((event: RealtimeEvent) => {
      if (!event?.data?.message) return;
      const message = event.data.message;
      
      // Update messages list only for the active conversation
      if (event.conversationId === selectedConversation) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === message.id);
          if (exists) return prev;
          // Insert message in correct sorted position by created_at
          const newMessages = [...prev, message];
          return newMessages.sort((a: any, b: any) => a.created_at - b.created_at);
        });
      }
      
      // ALWAYS update conversation list for any new incoming message
      if (message.message_type === 0) { // 0 = incoming message from contact
        setConversations(prev => {
          const updated = prev.map(conv => {
            if (conv.id === event.conversationId) {
              return {
                ...conv,
                unread_count: event.conversationId === selectedConversation 
                  ? 0 
                  : (conv.unread_count || 0) + 1,
                last_non_activity_message: {
                  content: message.content,
                  created_at: message.created_at,
                },
                timestamp: message.created_at,
              };
            }
            return conv;
          });
          return updated.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        });
      }
    }, [selectedConversation]),
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

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  };

  return {
    // State
    selectedConversation,
    conversations,
    messages,
    loadingMessages,
    fetchingMessages,
    initialLoad,
    conversationNotFound,
    messageInput,
    setMessageInput,
    initialScrollDone,
    sendingMessage,
    selectedFiles,
    showContactInfo,
    setShowContactInfo,
    chatReference,
    loadingChatReference,
    showCustomerSelector,
    setShowCustomerSelector,
    availableCustomers,
    customerSearchTerm,
    setCustomerSearchTerm,
    selectedCustomerToLink,
    showLinkConfirmation,
    customerTags,
    loadingTags,
    customerAttributes,
    loadingAttributes,
    customerAttributeDefinitions,
    customerNotes,
    loadingNotes,
    customerActivities,
    loadingActivities,
    showAttributeForm,
    setShowAttributeForm,
    newAttributeName,
    setNewAttributeName,
    newAttributeValue,
    setNewAttributeValue,
    newAttributeType,
    setNewAttributeType,
    newAttributeOptions,
    setNewAttributeOptions,
    editingAttributeId,
    setEditingAttributeId,
    showOrderForm,
    setShowOrderForm,
    customerOrders,
    loadingOrders,
    showTemplateSelector,
    setShowTemplateSelector,
    templateSearchQuery,
    setTemplateSearchQuery,
    isSSEConnected,
    isPolling,
    selectedConv,
    showReminderModal,
    setShowReminderModal,
    reminderMessageContext,
    reminders,
    loadingReminders,
    showProductSelector,
    setShowProductSelector,
    showCustomerDetailModal,
    setShowCustomerDetailModal,
    currentWorkspace,
    scheduledMessages,
    loadingScheduledMessages,
    showScheduledMessageModal,
    setShowScheduledMessageModal,

    // Refs
    fileInputRef,
    messagesContainerRef,
    messageRefs,
    
    // Handlers
    handleScroll,
    handleAddAttribute,
    handleUpdateAttribute,
    handleDeleteAttribute,
    handleAddNote,
    handleDeleteNote,
    availableTags,
    handleAddTag,
    handleRemoveTag,
    handleSelectCustomerToLink,
    handleConfirmLinkCustomer,
    handleCancelLinkCustomer,
    handleUnlinkCustomer,
    handleFileSelect,
    handleRemoveFile,
    handleSendMessage,
    formatTime,
    loadCustomerOrders,
    handleCreateReminderFromMessage,
    handleCreateReminderFromInput,
    handleSaveReminder,
    handleUpdateReminder,
    handleDeleteReminder,
    handleProductSelect,
    handleCreateScheduledMessage,
    handleCancelScheduledMessage,
  };
}