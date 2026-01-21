"use client";

import { X } from "lucide-react";

interface CustomFieldsModalProps {
  customFields: Record<string, any>;
  onClose: () => void;
}

export default function CustomFieldsModal({ customFields, onClose }: CustomFieldsModalProps) {
  const entries = Object.entries(customFields || {});

  if (entries.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-background rounded-xl p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Campos Personalizados</h3>
            <button onClick={onClose} className="p-2 hover:bg-hover-bg rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-text-secondary text-center py-8">
            No hay campos personalizados en este pedido
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl p-6 max-w-2xl w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Campos Personalizados</h3>
          <button onClick={onClose} className="p-2 hover:bg-hover-bg rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-hover-bg rounded-lg">
              <span className="text-sm font-medium text-foreground capitalize">
                {key.replace(/_/g, ' ')}
              </span>
              <span className="text-sm text-text-secondary">
                {typeof value === 'boolean' ? (value ? 'Sí' : 'No') : String(value)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
