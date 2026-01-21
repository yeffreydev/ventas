'use client';

import { useState } from 'react';
import { HiPaperClip, HiX, HiTemplate, HiClock, HiShoppingCart, HiMicrophone } from 'react-icons/hi';
import TemplateSelector from './TemplateSelector';
import ProductSelector from './ProductSelector';
import AudioRecorder from './AudioRecorder';

interface MessageInputProps {
  messageInput: string;
  setMessageInput: (value: string) => void;
  selectedFiles: File[];
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveFile: (index: number) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  sendingMessage: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  showTemplateSelector: boolean;
  setShowTemplateSelector: (show: boolean) => void;
  templateSearchQuery: string;
  setTemplateSearchQuery: (query: string) => void;
  onCreateReminder?: () => void;
  showProductSelector?: boolean;
  setShowProductSelector?: (show: boolean) => void;
  onProductSelect?: (product: any, variant?: any) => void;
  workspaceId?: string;
}

export default function MessageInput({
  messageInput,
  setMessageInput,
  selectedFiles,
  handleFileSelect,
  handleRemoveFile,
  handleSendMessage,
  sendingMessage,
  fileInputRef,
  showTemplateSelector,
  setShowTemplateSelector,
  templateSearchQuery,
  setTemplateSearchQuery,
  onCreateReminder,
  showProductSelector,
  setShowProductSelector,
  onProductSelect,
  workspaceId
}: MessageInputProps) {
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);

  const handleAudioRecordingComplete = (audioBlob: Blob) => {
    // Use MP3 extension - server will convert to proper MP3 format
    // (Chatwoot has a bug with OGG that corrupts the MIME type)
    const fileName = `voice-${Date.now()}.mp3`;
    const mimeType = 'audio/mpeg';

    // Create file with proper MIME type for server processing
    const audioFile = new File([audioBlob], fileName, {
      type: mimeType
    });

    console.log('AudioRecorder: Recorded blob type:', audioBlob.type, 'size:', audioBlob.size);
    console.log('AudioRecorder: Final file:', audioFile.name, '(server will convert to MP3)');

    // Add to selected files - server will convert to WhatsApp-compatible format
    const event = {
      target: {
        files: [audioFile]
      }
    } as any;

    handleFileSelect(event);
    setShowAudioRecorder(false);
  };

  return (
    <div className="border-t border-current/20 bg-background shrink-0">
      <form onSubmit={handleSendMessage} className="p-4">
        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 mb-3 bg-hover-bg rounded-lg">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 bg-background border border-current/20 rounded-lg text-sm"
              >
                <HiPaperClip className="w-4 h-4 text-primary" />
                <span className="text-foreground max-w-[150px] truncate">
                  {file.name}
                </span>
                <span className="text-text-tertiary text-xs">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="ml-1 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  title="Eliminar archivo"
                >
                  <HiX className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="flex items-center gap-2 relative">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.m4a,.mp3,.ogg"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sendingMessage}
            className="p-2.5 hover:bg-hover-bg rounded-full transition-all duration-200 disabled:opacity-50"
            title="Adjuntar archivo"
          >
            <HiPaperClip className="w-5 h-5 text-text-secondary" />
          </button>
          <button
            type="button"
            onClick={() => {
              setTemplateSearchQuery('');
              setShowTemplateSelector(!showTemplateSelector);
            }}
            disabled={sendingMessage}
            className={`p-2.5 hover:bg-hover-bg rounded-full transition-all duration-200 disabled:opacity-50 ${showTemplateSelector ? 'bg-primary/10 text-primary' : ''}`}
            title="Plantillas rápidas"
          >
            <HiTemplate className="w-5 h-5 text-text-secondary" />
          </button>
          {setShowProductSelector && (
            <button
              type="button"
              onClick={() => setShowProductSelector(true)}
              disabled={sendingMessage}
              className={`p-2.5 hover:bg-hover-bg rounded-full transition-all duration-200 disabled:opacity-50 ${showProductSelector ? 'bg-primary/10 text-primary' : ''}`}
              title="Enviar producto"
            >
              <HiShoppingCart className="w-5 h-5 text-text-secondary" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAudioRecorder(true)}
            disabled={sendingMessage}
            className="p-2.5 hover:bg-hover-bg rounded-full transition-all duration-200 disabled:opacity-50"
            title="Grabar audio"
          >
            <HiMicrophone className="w-5 h-5 text-text-secondary" />
          </button>
          <div className="flex-1 relative">
            {/* Template Selector Popup */}
            {showTemplateSelector && (
              <TemplateSelector
                onSelect={(content) => {
                  setMessageInput(content);
                  setShowTemplateSelector(false);
                }}
                onClose={() => setShowTemplateSelector(false)}
                searchQuery={templateSearchQuery}
              />
            )}
            <input
              type="text"
              placeholder="Escribe un mensaje o / para plantillas..."
              value={messageInput}
              onChange={(e) => {
                const value = e.target.value;
                setMessageInput(value);
                
                // Auto-open template selector when typing /
                if (value.startsWith('/') && !showTemplateSelector) {
                  setTemplateSearchQuery(value);
                  setShowTemplateSelector(true);
                } else if (value.startsWith('/') && showTemplateSelector) {
                  setTemplateSearchQuery(value);
                } else if (!value.startsWith('/') && showTemplateSelector) {
                  setShowTemplateSelector(false);
                }
              }}
              onKeyDown={(e) => {
                // Close template selector on Escape
                if (e.key === 'Escape' && showTemplateSelector) {
                  setShowTemplateSelector(false);
                  e.preventDefault();
                }
              }}
              disabled={sendingMessage}
              className="w-full px-4 py-3 bg-input-bg border border-input-border text-foreground placeholder-text-tertiary rounded-full focus:ring-2 focus:ring-primary focus:border-primary outline-none disabled:opacity-50 transition-all duration-200"
            />
          </div>
          <button
            type="submit"
            disabled={sendingMessage || (!messageInput.trim() && selectedFiles.length === 0)}
            className="p-3 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-primary/25"
            title="Enviar mensaje"
          >
            {sendingMessage ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        </div>
      </form>

      {/* Product Selector Modal */}
      {showProductSelector && setShowProductSelector && onProductSelect && (
        <ProductSelector
          onSelect={(product, variant) => {
            onProductSelect(product, variant);
            setShowProductSelector(false);
          }}
          onClose={() => setShowProductSelector(false)}
          workspaceId={workspaceId}
        />
      )}

      {/* Audio Recorder Modal */}
      {showAudioRecorder && (
        <AudioRecorder
          onRecordingComplete={handleAudioRecordingComplete}
          onCancel={() => setShowAudioRecorder(false)}
        />
      )}
    </div>
  );
}