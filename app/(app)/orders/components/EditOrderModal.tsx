"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Upload, FileCheck, Trash2 } from "lucide-react";
import { OrderWithDetails, OrderStatus } from "@/app/types/orders";
import { useWorkspace } from "@/app/providers/WorkspaceProvider";

interface EditOrderModalProps {
  order: OrderWithDetails;
  onClose: () => void;
  onSuccess: () =>void;
}

export default function EditOrderModal({ order, onClose, onSuccess }: EditOrderModalProps) {
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [fieldDefinitions, setFieldDefinitions] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    customer_id: order.customer_id || '',
    status: order.status,
    notes: order.notes || '',
    payment_proof_url: order.payment_proof_url || '',
    custom_fields: order.custom_fields || {}
  });

  useEffect(() => {
    if (currentWorkspace) {
      fetchCustomers();
      fetchFieldDefinitions();
    }
  }, [currentWorkspace]);

  const fetchCustomers = async () => {
    if (!currentWorkspace) return;
    try {
      const response = await fetch(`/api/customers?workspace_id=${currentWorkspace.id}`);
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchFieldDefinitions = async () => {
    if (!currentWorkspace) return;
    try {
      const response = await fetch(`/api/order-field-definitions?workspace_id=${currentWorkspace.id}`);
      if (response.ok) {
        const data = await response.json();
        setFieldDefinitions(data);
      }
    } catch (error) {
      console.error('Error fetching field definitions:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingProof(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/orders/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      setFormData(prev => ({ ...prev, payment_proof_url: data.url }));
    } catch (error) {
      alert('Error al subir el archivo');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleRemoveProof = () => {
    if (confirm('¿Estás seguro de que deseas quitar el comprobante de pago?')) {
      setFormData(prev => ({ ...prev, payment_proof_url: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar la orden');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-background rounded-xl p-6 max-w-3xl w-full mx-auto my-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Editar Pedido</h2>
            <p className="text-sm text-text-secondary mt-1">#{order.order_number}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Cliente
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              className="w-full px-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Sin cliente</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.email && `(${customer.email})`}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Estado
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as OrderStatus })}
              className="w-full px-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="pending">Pendiente</option>
              <option value="processing">Procesando</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          {/* Order Items (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Artículos (Solo lectura)
            </label>
            <div className="bg-hover-bg rounded-lg p-4 space-y-2">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-foreground">{item.product_name} x {item.quantity}</span>
                  <span className="font-semibold text-foreground">S/. {item.total.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between font-bold text-foreground">
                  <span>Total</span>
                  <span>S/. {order.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Proof */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Comprobante de Pago
            </label>
            <div className="space-y-2">
              {formData.payment_proof_url && (
                <div className="flex items-center justify-between p-3 bg-hover-bg rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <FileCheck className="w-4 h-4" />
                    <span>Comprobante cargado</span>
                    <a 
                      href={formData.payment_proof_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Ver
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveProof}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group"
                    title="Quitar comprobante"
                  >
                    <Trash2 className="w-4 h-4 text-red-500 group-hover:text-red-600" />
                  </button>
                </div>
              )}
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                disabled={uploadingProof}
                className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 disabled:opacity-50"
              />
              {uploadingProof && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Subiendo archivo...</span>
                </div>
              )}
            </div>
          </div>

          {/* Custom Fields */}
          {fieldDefinitions.length > 0 && (
            <div className="border-t border-current/10 pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Campos Personalizados</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fieldDefinitions.map((field) => {
                  const fieldValue = formData.custom_fields[field.name] || field.default_value || '';
                  
                  return (
                    <div key={field.id} className={field.type === 'checkbox' ? 'md:col-span-2' : ''}>
                      {field.type !== 'checkbox' && (
                        <label className="block text-sm font-medium text-foreground mb-2">
                          {field.label || field.name} {field.required && <span className="text-red-500">*</span>}
                        </label>
                      )}
                      
                      {/* SELECT field */}
                      {field.type === 'select' && (
                        <select
                          value={fieldValue}
                          onChange={(e) => setFormData({
                            ...formData,
                            custom_fields: { ...formData.custom_fields, [field.name]: e.target.value }
                          })}
                          required={field.required}
                          className="w-full px-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value="">Seleccionar...</option>
                          {field.options?.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                      
                      {/* DATE field */}
                      {field.type === 'date' && (
                        <input
                          type="date"
                          value={fieldValue}
                          onChange={(e) => setFormData({
                            ...formData,
                            custom_fields: { ...formData.custom_fields, [field.name]: e.target.value }
                          })}
                          required={field.required}
                          className="w-full px-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      )}
                      
                      {/* NUMBER field */}
                      {field.type === 'number' && (
                        <input
                          type="number"
                          step="any"
                          value={fieldValue === 0 || fieldValue === '0' ? '' : fieldValue}
                          onChange={(e) => setFormData({
                            ...formData,
                            custom_fields: { ...formData.custom_fields, [field.name]: e.target.value === '' ? 0 : e.target.value }
                          })}
                          required={field.required}
                          placeholder={`Ingrese ${field.label?.toLowerCase() || 'número'}`}
                          className="w-full px-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      )}
                      
                      {/* TEXT field */}
                      {field.type === 'text' && (
                        <input
                          type="text"
                          value={fieldValue}
                          onChange={(e) => setFormData({
                            ...formData,
                            custom_fields: { ...formData.custom_fields, [field.name]: e.target.value }
                          })}
                          required={field.required}
                          placeholder={`Ingrese ${field.label?.toLowerCase() || 'texto'}`}
                          className="w-full px-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      )}
                      
                      {/* CHECKBOX field */}
                      {field.type === 'checkbox' && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-hover-bg border border-input-border rounded-lg">
                          <input
                            type="checkbox"
                            id={`edit-field-${field.id}`}
                            checked={fieldValue === 'true' || fieldValue === true || fieldValue === 'on'}
                            onChange={(e) => setFormData({
                              ...formData,
                              custom_fields: { ...formData.custom_fields, [field.name]: e.target.checked.toString() }
                            })}
                            required={field.required}
                            className="w-5 h-5 text-primary bg-input-bg border-input-border rounded focus:ring-2 focus:ring-primary/50"
                          />
                          <label htmlFor={`edit-field-${field.id}`} className="text-sm text-foreground cursor-pointer flex-1">
                            {field.label || field.name}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notas
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Notas adicionales..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-foreground font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || uploadingProof}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Actualizando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
