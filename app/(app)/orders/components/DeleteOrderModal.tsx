"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import { OrderWithDetails } from "@/app/types/orders";

interface DeleteOrderModalProps {
  order: OrderWithDetails;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteOrderModal({ order, onClose, onConfirm }: DeleteOrderModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl p-6 max-w-md w-full mx-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 text-red-600">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
              <Trash2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Eliminar Pedido</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-hover-bg rounded-lg transition-colors text-text-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-text-secondary mb-4">
            ¿Estás seguro de que deseas eliminar permanentemente el pedido <span className="font-semibold text-foreground">#{order.order_number}</span>?
          </p>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-3 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p>
              Esta acción es irreversible y eliminará todos los datos asociados al pedido.
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-foreground font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Eliminando...' : 'Sí, Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
