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

// Global connection tracker to prevent duplicate connections
let activeConnectionId: string | null = null;

export function useRealtimeChat(options: UseRealtimeChatOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3; // Reduced from 5
  const connectionIdRef = useRef<string>(`conn_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const mountedRef = useRef(true);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Only clear global if we own it
    if (activeConnectionId === connectionIdRef.current) {
      activeConnectionId = null;
    }

    if (mountedRef.current) {
      setIsConnected(false);
      setIsReconnecting(false);
    }
    reconnectAttemptsRef.current = 0;
  }, []);

  const connect = useCallback(() => {
    // Prevent duplicate connections
    if (eventSourceRef.current && eventSourceRef.current.readyState !== EventSource.CLOSED) {
      return;
    }

    // Only allow one active connection per app
    if (activeConnectionId && activeConnectionId !== connectionIdRef.current) {
      return;
    }

    try {
      const params = new URLSearchParams({
        accountId: options.accountId.toString(),
      });

      if (options.inboxIds.length > 0) {
        params.append('inboxIds', options.inboxIds.join(','));
      }

      if (options.activeConversationId) {
        params.append('conversationId', options.activeConversationId.toString());
      }

      const url = `/chats/chat/api/stream?${params.toString()}`;
      
      // Register this connection globally
      activeConnectionId = connectionIdRef.current;

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        setIsReconnecting(false);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.addEventListener('connection', () => {});
      eventSource.addEventListener('ping', () => {});

      eventSource.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'connected' || data.type === 'ping') {
            return;
          }

          switch (data.event) {
            case 'message.created':
              options.onMessageCreated?.(data);
              break;
            case 'conversation.created':
              options.onConversationCreated?.(data);
              break;
            case 'conversation.updated':
              options.onConversationUpdated?.(data);
              break;
            case 'conversation.status_changed':
              options.onConversationStatusChanged?.(data);
              break;
          }
        } catch (error) {
          // Silently ignore parse errors
        }
      };

      eventSource.onerror = () => {
        if (!mountedRef.current) return;
        
        setIsConnected(false);
        eventSource.close();
        eventSourceRef.current = null;

        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(2000 * Math.pow(2, reconnectAttemptsRef.current), 15000);
          
          setIsReconnecting(true);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!mountedRef.current) return;
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          setIsReconnecting(false);
          // Clear global connection on max retries
          if (activeConnectionId === connectionIdRef.current) {
            activeConnectionId = null;
          }
        }
      };

    } catch (error) {
      // Silently fail
    }
  }, [options.accountId, options.inboxIds, options.activeConversationId, options.onMessageCreated, options.onConversationCreated, options.onConversationUpdated, options.onConversationStatusChanged, disconnect]);

  useEffect(() => {
    mountedRef.current = true;
    
    // Delay connection slightly to avoid race conditions
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        connect();
      }
    }, 100);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      disconnect();
    };
  }, [options.accountId, JSON.stringify(options.inboxIds.sort()), options.activeConversationId]); // Note: stringifying to avoid false positives

  return {
    isConnected,
    isReconnecting,
  };
}