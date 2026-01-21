'use client';

import { useState, useEffect } from 'react';
import {
  HiX,
  HiClock,
  HiCalendar,
  HiExclamationCircle,
} from 'react-icons/hi';
import { SiWhatsapp } from 'react-icons/si';
import { useWorkspace } from '@/app/providers/WorkspaceProvider';

interface CreateMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => void;
}

export default function CreateMessageModal({ isOpen, onClose, onSubmit }: CreateMessageModalProps) {
  const { currentWorkspace } = useWorkspace();
  
  // Helper function to get default date and time (current time)
  const getDefaultDateTime = () => {
    const now = new Date();
    
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    let hours = now.getHours();
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert to 12-hour format
    const minutes = now.getMinutes();
    
    return { date, hours, minutes, period };
  };
  
  const defaultDateTime = getDefaultDateTime();
  
  const [formData, setFormData] = useState({
    customer_id: '',
    message: '',
    scheduled_date: defaultDateTime.date,
    scheduled_hour: defaultDateTime.hours,
    scheduled_minute: defaultDateTime.minutes,
    scheduled_period: defaultDateTime.period as 'AM' | 'PM',
    channel: 'whatsapp',
  });

  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Convert to ISO string for the API
  const getScheduledAtISO = () => {
    let hours = formData.scheduled_hour;
    if (formData.scheduled_period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (formData.scheduled_period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    const localDate = new Date(
      parseInt(formData.scheduled_date.split('-')[0]),
      parseInt(formData.scheduled_date.split('-')[1]) - 1,
      parseInt(formData.scheduled_date.split('-')[2]),
      hours,
      formData.scheduled_minute,
      0
    );
    
    return localDate.toISOString();
  };
  
  const validateDateTime = () => {
    const scheduledAt = new Date(getScheduledAtISO());
    const now = new Date();
    
    if (scheduledAt <= now) {
      setError('La fecha y hora debe ser en el futuro. Por favor selecciona un momento posterior al actual.');
      return false;
    }
    return true;
  };

  // Load customers when modal opens
  useEffect(() => {
    if (isOpen && currentWorkspace) {
      fetchCustomers();
    }
  }, [isOpen, currentWorkspace]);

  // Fetch customers from API
  const fetchCustomers = async () => {
    if (!currentWorkspace) return;
    
    try {
      setLoadingCustomers(true);
      const response = await fetch(`/api/customers?workspace_id=${currentWorkspace.id}`);
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setError(null);
    
    if (!validateDateTime()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        customer_id: formData.customer_id,
        message: formData.message,
        scheduled_at: getScheduledAtISO(),
        channel: formData.channel,
        target_type: 'single',
      });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al programar el mensaje');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl max-w-sm w-full shadow-2xl border border-red-200 dark:border-red-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <HiExclamationCircle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                No se puede programar
              </h3>
              <p className="text-sm text-text-secondary mb-6">
                {error}
              </p>
              <button
                onClick={() => setError(null)}
                className="w-full px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-current/20">
        {/* Modal Header */}
        <div className="bg-background border-b border-current/20 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <HiClock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Nuevo Mensaje Programado</h3>
              <p className="text-sm text-text-secondary mt-1">
                Programa un mensaje para enviar automáticamente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
          >
            <HiX className="w-6 h-6 text-text-secondary" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Cliente *
            </label>
            {loadingCustomers ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-text-secondary mt-2">Cargando clientes...</p>
              </div>
            ) : (
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                required
                className="w-full px-4 py-3 border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                <option value="">Selecciona un cliente</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone || customer.email}
                  </option>
                ))}
              </select>
            )}
            {!loadingCustomers && customers.length === 0 && (
              <p className="text-sm text-text-secondary mt-2">
                No hay clientes disponibles. Primero debes tener conversaciones activas en Chatwoot.
              </p>
            )}
          </div>

          {/* Channel Display (Fixed to WhatsApp) */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Canal
            </label>
            <div className="p-4 rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-500/10">
              <div className="flex items-center gap-3">
                <SiWhatsapp className="w-6 h-6 text-green-500" />
                <div>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                    WhatsApp
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    El mensaje se enviará por WhatsApp
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Mensaje *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
              rows={4}
              placeholder="Escribe tu mensaje aquí..."
              className="w-full px-4 py-3 border border-input-border rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
            />
            <p className="text-xs text-text-tertiary mt-2">
              {formData.message.length} caracteres
            </p>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Fecha *
              </label>
              <div className="relative">
                <HiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-5 h-5" />
                <input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Hora *
              </label>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <HiClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-5 h-5" />
                  <select
                    value={formData.scheduled_hour}
                    onChange={(e) => setFormData({ ...formData, scheduled_hour: parseInt(e.target.value) })}
                    className="w-full pl-10 pr-3 py-3 border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors appearance-none"
                  >
                    {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <span className="text-foreground font-bold">:</span>
                <select
                  value={formData.scheduled_minute}
                  onChange={(e) => setFormData({ ...formData, scheduled_minute: parseInt(e.target.value) })}
                  className="w-20 px-3 py-3 border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors appearance-none"
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                  ))}
                </select>
                <div className="flex rounded-lg border border-input-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, scheduled_period: 'AM' })}
                    className={`px-3 py-3 text-sm font-medium transition-colors ${formData.scheduled_period === 'AM' ? 'bg-primary text-white' : 'bg-input-bg text-foreground hover:bg-hover-bg'}`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, scheduled_period: 'PM' })}
                    className={`px-3 py-3 text-sm font-medium transition-colors ${formData.scheduled_period === 'PM' ? 'bg-primary text-white' : 'bg-input-bg text-foreground hover:bg-hover-bg'}`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="bg-background border-t border-current/20 p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-current/20 rounded-lg hover:bg-hover-bg transition-colors font-medium text-foreground"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`flex-1 px-4 py-2.5 bg-primary text-white rounded-lg transition-colors font-medium shadow-sm ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90'}`}
          >
            {isSubmitting ? 'Programando...' : 'Programar Mensaje'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}