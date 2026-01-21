"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { PaymentMethod } from "@/app/types/payments";
import { useWorkspace } from "@/app/providers/WorkspaceProvider";

interface PaymentFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentForm({ onClose, onSuccess }: PaymentFormProps) {
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  useEffect(() => {
    if (currentWorkspace) {
      fetchOrders();
    }
  }, [currentWorkspace]);

  const fetchOrders = async () => {
    if (!currentWorkspace) return;
    try {
      const response = await fetch(`/api/orders?workspace_id=${currentWorkspace.id}&page_size=100`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !selectedOrderId) return;

    try {
      setLoading(true);
      
      const selectedOrder = orders.find(o => o.id === selectedOrderId);
      if (!selectedOrder) {
        alert('Por favor selecciona un pedido');
        return;
      }

      const payload = {
        order_id: selectedOrderId,
        workspace_id: currentWorkspace.id,
        customer_id: selectedOrder.customer_id || null,
        amount: selectedOrder.total_amount,
        currency: "USD",
        status: "completed",
        payment_method: paymentMethod,
        payment_date: new Date().toISOString(),
      };

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error creando pago');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving payment:', error);
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
            Registrar Pago
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
          {/* Order Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Pedido <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Seleccionar pedido</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.order_number} - ${order.total_amount.toFixed(2)} ({order.customer_name || 'Sin cliente'})
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Método de Pago <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
              <option value="paypal">PayPal</option>
              <option value="other">Otro</option>
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
              disabled={loading || !selectedOrderId}
              className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Registrar Pago
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
