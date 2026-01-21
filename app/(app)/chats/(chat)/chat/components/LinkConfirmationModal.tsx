'use client';

import { HiUser } from 'react-icons/hi';
import { Badge } from 'flowbite-react';

interface LinkConfirmationModalProps {
  showLinkConfirmation: boolean;
  selectedCustomerToLink: any;
  handleConfirmLinkCustomer: () => void;
  handleCancelLinkCustomer: () => void;
}

export default function LinkConfirmationModal({
  showLinkConfirmation,
  selectedCustomerToLink,
  handleConfirmLinkCustomer,
  handleCancelLinkCustomer
}: LinkConfirmationModalProps) {
  if (!showLinkConfirmation || !selectedCustomerToLink) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl max-w-md w-full shadow-2xl border border-current/20 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-current/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <HiUser className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Confirmar Vinculación</h3>
              <p className="text-sm text-text-secondary mt-1">
                ¿Estás seguro de vincular este cliente?
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-hover-bg rounded-lg p-4 border border-current/20">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                {selectedCustomerToLink.name.charAt(0).toUpperCase()}
              </div>
              
              {/* Customer Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-lg">
                  {selectedCustomerToLink.name}
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  {selectedCustomerToLink.email}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-1 bg-background rounded text-text-tertiary">
                    {selectedCustomerToLink.identity_document_type}: {selectedCustomerToLink.identity_document_number}
                  </span>
                  {selectedCustomerToLink.city && (
                    <span className="text-xs px-2 py-1 bg-background rounded text-text-tertiary">
                      📍 {selectedCustomerToLink.city}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <Badge color="info" size="sm">
                    {selectedCustomerToLink.stage}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Nota:</strong> Esta conversación quedará vinculada a este cliente y podrás ver toda su información en el perfil del chat.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-current/20 flex gap-3">
          <button
            onClick={handleCancelLinkCustomer}
            className="flex-1 px-4 py-2.5 border border-current/20 rounded-lg hover:bg-hover-bg transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmLinkCustomer}
            className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/25"
          >
            Confirmar Vinculación
          </button>
        </div>
      </div>
    </div>
  );
}