"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { PaymentStatus } from "@/app/types/payments";

interface EditPaymentStatusProps {
  payment: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPaymentStatus({ payment, onClose, onSuccess }: EditPaymentStatusProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>(payment.status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await fetch(`/api/payments/${payment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error actualizando estado');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-current/20">
          <h2 className="text-xl font-bold text-foreground">
            Editar Estado del Pago
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Payment Info */}
          <div className="bg-hover-bg rounded-lg p-4 mb-4">
            <p className="text-sm text-text-secondary">Pago:</p>
            <p className="text-base font-semibold text-foreground">{payment.payment_number}</p>
            <p className="text-sm text-text-secondary mt-2">Monto:</p>
            <p className="text-base font-semibold text-foreground">{payment.currency} {payment.amount.toFixed(2)}</p>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Estado del Pago <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={status}
              onChange={(e) => setStatus(e.target.value as PaymentStatus)}
              className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="pending">Pendiente</option>
              <option value="completed">Completado</option>
              <option value="failed">Fallido</option>
              <option value="refunded">Reembolsado</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-current/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-foreground font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Actualizar Estado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
