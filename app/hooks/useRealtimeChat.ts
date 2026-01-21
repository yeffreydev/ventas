import { useEffect, useRef, useState, useCallback } from 'react';

export interface RealtimeEvent {
  event: string;
  accountId: number;
  inboxId?: number;
  conversationId?: number;
  data: any;
}

export interface UseRealtimeChatOptions {
  accountId: number;
  inboxIds: number[];
  activeConversationId?: number;
  onMessageCreated?: (event: RealtimeEvent) => void;
  onConversationCreated?: (event: RealtimeEvent) => void;
  onConversationUpdated?: (event: RealtimeEvent) => void;
  onConversationStatusChanged?: (event: RealtimeEvent) => void;
}

export function useRealtimeChat(options: UseRealtimeChatOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const lastOptionsRef = useRef<UseRealtimeChatOptions | null>(null);

  const connect = useCallback(() => {
    try {
      // Build URL with query parameters
      const params = new URLSearchParams({
        accountId: options.accountId.toString(),
      });

      // Add inbox IDs if available
      if (options.inboxIds.length > 0) {
        params.append('inboxIds', options.inboxIds.join(','));
      }

      // Add active conversation ID if available
      if (options.activeConversationId) {
        params.append('conversationId', options.activeConversationId.toString());
      }

      const url = `/chats/chat/api/stream?${params.toString()}`;
      console.log('🔌 Attempting SSE connection to:', url);
      console.log('📋 Options:', {
        accountId: options.accountId,
        inboxIds: options.inboxIds,
        activeConversationId: options.activeConversationId
      });

      // Store current options for comparison
      lastOptionsRef.current = options;

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('✅ SSE connected successfully!');
        setIsConnected(true);
        setIsReconnecting(false);
        reconnectAttemptsRef.current = 0;
      };

      // Handle different event types
      eventSource.addEventListener('connection', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('✅ Connection event:', data);
        } catch (error) {
          console.error('Error parsing connection event:', error);
        }
      });

      eventSource.addEventListener('ping', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('💓 Ping received:', data);
        } catch (error) {
          console.error('Error parsing ping event:', error);
        }
      });

      // Handle default messages (Chatwoot events)
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          console.log('📨 SSE message received:', data);
          console.log('📨 Event type:', data.event);

          // Handle connection/ping messages
          if (data.type === 'connected' || data.type === 'ping') {
            return;
          }

          // Handle Chatwoot events
          console.log('🎯 Processing Chatwoot event:', data.event);
          switch (data.event) {
            case 'message.created':
              console.log('📨 Message created event:', data);
              options.onMessageCreated?.(data);
              break;

            case 'conversation.created':
              console.log('💬 Conversation created event:', data);
              options.onConversationCreated?.(data);
              break;

            case 'conversation.updated':
              console.log('🔄 Conversation updated event:', data);
              options.onConversationUpdated?.(data);
              break;

            case 'conversation.status_changed':
              console.log('📊 Conversation status changed event:', data);
              options.onConversationStatusChanged?.(data);
              break;

            default:
              console.log('❓ Unhandled event:', data.event);
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ SSE error:', error);
        console.error('❌ EventSource readyState:', eventSource.readyState);
        setIsConnected(false);
        eventSource.close();
        eventSourceRef.current = null;

        // Only attempt to reconnect if this is a genuine connection error
        // (not due to intentional disconnection or options change)
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

          setIsReconnecting(true);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          console.error('Max reconnection attempts reached');
          setIsReconnecting(false);
        }
      };

    } catch (error) {
      console.error('Error creating SSE connection:', error);
    }
  }, [options.accountId, options.inboxIds, options.activeConversationId]);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting SSE connection');
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    setIsReconnecting(false);
    reconnectAttemptsRef.current = 0; // Reset attempts on manual disconnect
  }, []);

  // Connect on mount and reconnect when options change
  useEffect(() => {
    // Check if options have changed significantly
    const optionsChanged = !lastOptionsRef.current ||
      lastOptionsRef.current.accountId !== options.accountId ||
      JSON.stringify(lastOptionsRef.current.inboxIds.sort()) !== JSON.stringify(options.inboxIds.sort()) ||
      lastOptionsRef.current.activeConversationId !== options.activeConversationId;

    if (optionsChanged) {
      console.log('🔄 SSE options changed, reconnecting...');
      disconnect();
      connect();
    }

    return () => disconnect();
  }, [options.accountId, options.inboxIds, options.activeConversationId, connect, disconnect]);

  return {
    isConnected,
    isReconnecting,
  };
}