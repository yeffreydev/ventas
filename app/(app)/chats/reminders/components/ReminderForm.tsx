'use client';

import { useState, useEffect } from 'react';
import { HiX } from 'react-icons/hi';
import { Spinner } from 'flowbite-react';
import { useWorkspace } from '@/app/providers/WorkspaceProvider';
import type { Reminder } from '@/app/types/reminders';

interface ReminderFormProps {
  reminder?: Reminder | null;
  onClose: () => void;
  onSubmit: () => void;
}

interface Customer {
  id: string;
  name: string;
}

export default function ReminderForm({ reminder, onClose, onSubmit }: ReminderFormProps) {
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  
  const [formData, setFormData] = useState({
    title: reminder?.title || '',
    description: reminder?.description || '',
    due_date: reminder?.due_date ? reminder.due_date.split('T')[0] : '',
    priority: reminder?.priority || 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    customer_id: reminder?.customer_id || '',
    status: reminder?.status || 'pending' as 'pending' | 'in_progress' | 'completed' | 'cancelled'
  });

  useEffect(() => {
    if (currentWorkspace) {
      fetchCustomers();
    }
  }, [currentWorkspace]);

  const fetchCustomers = async () => {
    if (!currentWorkspace) return;

    try {
      setLoadingCustomers(true);
      const response = await fetch(`/api/customers?workspace_id=${currentWorkspace.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setCustomers(data || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('El título es requerido');
      return;
    }

    if (!currentWorkspace) {
      alert('No hay workspace seleccionado');
      return;
    }

    try {
      setLoading(true);

      const body = {
        ...formData,
        customer_id: formData.customer_id || null,
        due_date: formData.due_date || null,
        workspace_id: currentWorkspace.id
      };

      const url = reminder ? '/api/reminders' : '/api/reminders';
      const method = reminder ? 'PUT' : 'POST';

      if (reminder) {
        (body as any).id = reminder.id;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error saving reminder');
      }

      onSubmit();
    } catch (error: any) {
      console.error('Error saving reminder:', error);
      alert(error.message || 'Error al guardar el recordatorio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg max-w-xl w-full shadow-xl border border-current/10">
        <div className="flex items-center justify-between p-5 border-b border-current/10">
          <h3 className="text-lg font-semibold text-foreground">
            {reminder ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-hover-bg rounded-md transition-colors"
          >
            <HiX className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-input-bg border border-input-border rounded-lg text-foreground placeholder:text-text-tertiary focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="Ej: Llamar al cliente"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-input-bg border border-input-border rounded-lg text-foreground placeholder:text-text-tertiary focus:outline-none focus:border-primary/50 transition-colors resize-none"
              placeholder="Detalles del recordatorio..."
            />
          </div>

          {/* Due Date and Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Vencimiento
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-input-bg border border-input-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Prioridad
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-3 py-2 text-sm bg-input-bg border border-input-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>

          {/* Customer and Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Cliente
              </label>
              {loadingCustomers ? (
                <div className="flex items-center justify-center py-2 bg-input-bg rounded-lg border border-input-border">
                  <Spinner size="sm" />
                </div>
              ) : (
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-input-bg border border-input-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                >
                  <option value="">Sin cliente</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {reminder && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Estado
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm bg-input-bg border border-input-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                >
                  <option value="pending">Pendiente</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="completed">Completado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-current/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm bg-background hover:bg-hover-bg border border-current/10 rounded-lg text-foreground font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Spinner size="sm" />}
              <span>{reminder ? 'Actualizar' : 'Crear'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
