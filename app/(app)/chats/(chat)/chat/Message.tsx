'use client';

import { HiPaperClip, HiClock } from 'react-icons/hi';
import { ChatwootMessage, ChatwootConversation } from './api-client';
import ImageAttachment from './components/ImageAttachment';

interface MessageProps {
  message: ChatwootMessage & { sending?: boolean; tempId?: string };
  selectedConv?: ChatwootConversation;
  formatTime: (timestamp: number) => string;
  onCreateReminder?: (message: ChatwootMessage) => void;
}

export default function Message({ message, selectedConv, formatTime, onCreateReminder }: MessageProps) {
  const isIncoming = message.message_type === 0;
  const isOutgoing = message.message_type === 1;
  const isActivity = message.message_type === 2;
  const isSending = message.sending === true;

  if (isActivity) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-hover-bg rounded-full px-4 py-1.5 text-xs text-text-secondary font-medium">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} group animate-fadeIn relative`}
    >
      {/* Create Reminder Button - Shows on hover */}
      {onCreateReminder && message.content && (
        <button
          onClick={() => onCreateReminder(message)}
          className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-hover-bg rounded-full"
          title="Crear recordatorio desde este mensaje"
        >
          <HiClock className="w-4 h-4 text-text-secondary hover:text-primary" />
        </button>
      )}
      <div className={`flex items-end gap-2 max-w-[75%] ${isOutgoing ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar for incoming messages */}
        {isIncoming && (
          <div className="shrink-0 mb-0.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center border border-gray-200 dark:border-gray-600">
              {selectedConv?.meta?.sender?.thumbnail ? (
                <img
                  src={selectedConv.meta.sender.thumbnail}
                  alt={selectedConv.meta.sender.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-300">
                  {selectedConv?.meta?.sender?.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              )}
            </div>
          </div>
        )}
        
        <div className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'}`}>
          {/* Sender name for incoming messages */}
          {message.sender && isIncoming && (
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">
              {message.sender.name}
            </span>
          )}

          <div className={`relative rounded-2xl px-3 py-2 shadow-sm ${
            isOutgoing
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white rounded-br-md'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-foreground rounded-bl-md'
          }`}>
            {/* Attachments/Images */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-2 space-y-2">
                {message.attachments.map((attachment: any, idx: number) => {
                  if (attachment.file_type === 'image') {
                    return (
                      <div key={idx} className="mb-2">
                        <ImageAttachment
                          src={attachment.data_url}
                          alt="Imagen adjunta"
                          onClick={() => window.open(attachment.data_url, '_blank')}
                        />
                      </div>
                    );
                  } else if (attachment.file_type === 'audio') {
                    return (
                      <div key={idx} className={`rounded-lg p-3 ${
                        isOutgoing ? 'bg-white/10' : 'bg-hover-bg'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isOutgoing ? 'bg-white/20' : 'bg-primary/10'
                          }`}>
                            <svg className={`w-4 h-4 ${isOutgoing ? 'text-white' : 'text-primary'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className={`text-xs font-medium ${isOutgoing ? 'text-white' : 'text-foreground'}`}>
                            Mensaje de voz
                          </span>
                        </div>
                        <audio
                          src={attachment.data_url}
                          controls
                          className="w-full max-w-xs"
                          style={{
                            height: '32px',
                            filter: isOutgoing ? 'invert(1) brightness(1.2)' : 'none'
                          }}
                        />
                      </div>
                    );
                  } else if (attachment.file_type === 'video') {
                    return (
                      <div key={idx} className="rounded-lg overflow-hidden border border-current/10">
                        <video
                          src={attachment.data_url}
                          controls
                          className="max-w-full h-auto"
                          style={{
                            maxHeight: '300px',
                            width: '100%',
                            backgroundColor: 'var(--hover-bg)'
                          }}
                        />
                      </div>
                    );
                  } else if (attachment.file_type === 'file') {
                    return (
                      <a
                        key={idx}
                        href={attachment.data_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 p-2 rounded-lg border ${
                          isOutgoing ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-hover-bg border-current/10 hover:bg-hover-bg/80'
                        } transition-all duration-200`}
                      >
                        <HiPaperClip className={`w-4 h-4 ${isOutgoing ? 'text-white' : 'text-text-secondary'}`} />
                        <span className={`text-xs font-medium ${isOutgoing ? 'text-white' : 'text-foreground'}`}>
                          📎 Archivo
                        </span>
                      </a>
                    );
                  }
                  return null;
                })}
              </div>
            )}
            
            {/* Message content */}
            {message.content && (
              <p className={`text-sm leading-relaxed ${isOutgoing ? 'text-white' : 'text-foreground'}`}>
                {message.content}
              </p>
            )}
            
            {/* Time and status */}
            <div className="flex items-center justify-end gap-1 mt-1.5">
              <span className={`text-[10px] ${
                isOutgoing ? 'text-white/70' : 'text-text-tertiary'
              }`}>
                {formatTime(message.created_at)}
              </span>
              {isOutgoing && (
                <div className="relative flex items-center">
                  {isSending ? (
                    /* Sending indicator - clock icon */
                    <svg className="w-3 h-3 text-white/50 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                    </svg>
                  ) : (
                    /* Double check mark (read/delivered) */
                    <>
                      <svg className="w-3 h-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <svg className="w-3 h-3 text-white/70 -ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}