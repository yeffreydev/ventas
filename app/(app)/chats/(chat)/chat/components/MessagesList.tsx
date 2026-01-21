'use client';

import { Spinner } from 'flowbite-react';
import { ChatwootMessage, ChatwootConversation } from '../api-client';
import Message from '../Message';

interface MessagesListProps {
  messages: ChatwootMessage[];
  loadingMessages: boolean;
  fetchingMessages?: boolean;
  selectedConv: ChatwootConversation;
  formatTime: (timestamp: number) => string;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  messageRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
  onCreateReminder?: (message: ChatwootMessage) => void;
  initialScrollDone?: boolean;
}

export default function MessagesList({
  messages,
  loadingMessages,
  fetchingMessages = false,
  selectedConv,
  formatTime,
  messagesContainerRef,
  handleScroll,
  messageRefs,
  onCreateReminder,
  initialScrollDone = true
}: MessagesListProps) {
  return (
    <div
      ref={messagesContainerRef}
      onScroll={handleScroll}
      className={`flex-1 flex flex-col overflow-y-auto px-4 py-4 space-y-4 bg-gray-50/30 dark:bg-gray-900/20 min-h-0 transition-opacity duration-200 relative ${
        initialScrollDone ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        scrollBehavior: 'smooth',
        overscrollBehavior: 'contain'
      }}
    >
      {/* Minimalist loading indicator - top right corner */}
      {fetchingMessages && messages.length > 0 && (
        <div className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm rounded-full p-1.5 shadow-sm">
          <Spinner size="sm" />
        </div>
      )}

      {loadingMessages && messages.length === 0 ? (
        <div className="flex justify-center items-center h-full">
          <Spinner size="lg" />
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center text-text-secondary">
          No hay mensajes en esta conversación
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            ref={(el) => {
              if (el) {
                messageRefs.current.set(message.id, el);
              } else {
                messageRefs.current.delete(message.id);
              }
            }}
            data-message-id={message.id}
            data-message-timestamp={message.created_at}
          >
            <Message
              message={message}
              selectedConv={selectedConv}
              formatTime={formatTime}
              onCreateReminder={onCreateReminder}
            />
          </div>
        ))
      )}
    </div>
  );
}