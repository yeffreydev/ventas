import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

export interface RealtimeEvent {
  event: string;
  accountId: number;
  inboxId?: number;
  conversationId?: number;
  data: any;
  timestamp: number;
}

export interface UsePollingChatOptions {
  accountId: number;
  activeConversationId?: number;
  onMessageCreated?: (event: RealtimeEvent) => void;
  onConversationCreated?: (event: RealtimeEvent) => void;
  onConversationUpdated?: (event: RealtimeEvent) => void;
  onConversationStatusChanged?: (event: RealtimeEvent) => void;
  pollingInterval?: number; // milliseconds
  enabled?: boolean; // whether polling should be active
}

export function usePollingChat(options: UsePollingChatOptions) {
  const [isPolling, setIsPolling] = useState(false);
  const lastTimestampRef = useRef<number>(Date.now());
  const pollingIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const interval = options.pollingInterval || 2000; // Default 2 seconds

  useEffect(() => {
    // Only start polling if enabled (default true)
    if (options.enabled === false) {
      console.log('🔄 Polling disabled');
      setIsPolling(false);
      return;
    }

    console.log('🔄 Starting polling for new events...');
    setIsPolling(true);

    const poll = async () => {
      try {
        const response = await axios.get(`/api/events/latest?since=${lastTimestampRef.current}`);
        const { events, timestamp } = response.data;

        if (events && events.length > 0) {
          console.log(`📨 Received ${events.length} new events`);

          events.forEach((event: RealtimeEvent) => {
            console.log('📦 Processing event:', event.event, event);

            switch (event.event) {
              case 'message.created':
                options.onMessageCreated?.(event);
                break;

              case 'conversation.created':
                options.onConversationCreated?.(event);
                break;

              case 'conversation.updated':
                options.onConversationUpdated?.(event);
                break;

              case 'conversation.status_changed':
                options.onConversationStatusChanged?.(event);
                break;

              default:
                console.log('Unhandled event:', event.event);
            }
          });
        }

        // Update last timestamp
        lastTimestampRef.current = timestamp;
      } catch (error) {
        console.error('❌ Error polling events:', error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    pollingIntervalRef.current = setInterval(poll, interval);

    return () => {
      console.log('🛑 Stopping polling');
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      setIsPolling(false);
    };
  }, [options.accountId, options.activeConversationId, interval, options.enabled]);

  return {
    isPolling,
  };
}