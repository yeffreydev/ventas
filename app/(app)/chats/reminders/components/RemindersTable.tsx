'use client';

import { useState, useEffect } from 'react';
import {
  HiTrash,
  HiPencil,
  HiPlus,
  HiSearch,
  HiClock,
  HiCheckCircle,
  HiExclamationCircle,
  HiX
} from 'react-icons/hi';
import { Spinner } from 'flowbite-react';
import ReminderForm from './ReminderForm';
import { useWorkspace } from '@/app/providers/WorkspaceProvider';
import type { Reminder } from '@/app/types/reminders';

interface ReminderWithCustomer extends Reminder {
  workspace_id?: string;
  customers?: {
    name: string;
  };
}

export default function RemindersTable() {
  const { currentWorkspace } = useWorkspace();
  const [reminders, setReminders] = useState<ReminderWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderWithCustomer | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  useEffect(() => {
    if (currentWorkspace) {
      fetchReminders();
    }
  }, [currentWorkspace]);

  const fetchReminders = async () => {
    if (!currentWorkspace) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/reminders?workspace_id=${currentWorkspace.id}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error fetching reminders');
      }

      const data = await response.json();
      setReminders(data.reminders || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!reminderToDelete) return;

    try {
      const response = await fetch(`/api/reminders?id=${reminderToDelete}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error deleting reminder');
      }

      setReminders(reminders.filter(r => r.id !== reminderToDelete));
      setDeleteModal(false);
      setReminderToDelete(null);
    } catch (error) {
      console.error('Error deleting reminder:', error);
      alert('Error al eliminar recordatorio');
    }
  };

  const handleToggleStatus = async (reminder: ReminderWithCustomer) => {
    try {
      const newStatus = reminder.status === 'completed' ? 'pending' : 'completed';
      const response = await fetch('/api/reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reminder.id,
          status: newStatus
        })
      });

      if (!response.ok) {
        throw new Error('Error updating reminder status');
      }

      await fetchReminders();
    } catch (error) {
      console.error('Error toggling reminder status:', error);
      alert('Error al actualizar el estado');
    }
  };

  const handleEdit = (reminder: ReminderWithCustomer) => {
    setEditingReminder(reminder);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingReminder(null);
  };

  const handleFormSubmit = async () => {
    await fetchReminders();
    handleFormClose();
  };

  const getPriorityLabel = (priority: string) => {
    const labels: { [key: string]: string } = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      urgent: 'Urgente'
    };
    return labels[priority] || priority;
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: 'Pendiente',
      in_progress: 'En Progreso',
      completed: 'Completado',
      cancelled: 'Cancelado'
    };
    return labels[status] || status;
  };

  const isOverdue = (reminder: ReminderWithCustomer) => {
    if (!reminder.due_date || reminder.status === 'completed') return false;
    return new Date(reminder.due_date) < new Date();
  };

  // Filter reminders
  const filteredReminders = reminders.filter(reminder => {
    const matchesSearch = 
      reminder.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reminder.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || reminder.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || reminder.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Calculate stats
  const stats = [
    {
      title: 'Total Recordatorios',
      value: reminders.length.toString(),
      icon: HiClock,
      color: 'text-primary'
    },
    {
      title: 'Pendientes',
      value: reminders.filter(r => r.status === 'pending').length.toString(),
      icon: HiExclamationCircle,
      color: 'text-yellow-500'
    },
    {
      title: 'Completados',
      value: reminders.filter(r => r.status === 'completed').length.toString(),
      icon: HiCheckCircle,
      color: 'text-green-500'
    },
    {
      title: 'Vencidos',
      value: reminders.filter(r => isOverdue(r)).length.toString(),
      icon: HiX,
      color: 'text-red-500'
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner aria-label="Cargando recordatorios" size="xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Recordatorios</h1>
        <p className="text-sm text-text-secondary mt-1">Gestiona tus recordatorios y tareas</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-background rounded-lg p-4 border border-current/10"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-text-secondary mb-1">{stat.title}</p>
                <p className="text-xl font-semibold text-foreground">{stat.value}</p>
              </div>
              <stat.icon className={`w-5 h-5 ${stat.color} opacity-60`} />
            </div>
          </div>
        ))}
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 gap-2 max-w-2xl">
          {/* Search */}
          <div className="relative flex-1">
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-input-bg border border-input-border rounded-lg text-foreground placeholder:text-text-tertiary focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-input-bg border border-input-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="all">Estado</option>
            <option value="pending">Pendiente</option>
            <option value="in_progress">En Progreso</option>
            <option value="completed">Completado</option>
            <option value="cancelled">Cancelado</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-input-bg border border-input-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="all">Prioridad</option>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>
        </div>

        <button 
          onClick={() => setShowForm(true)}
          className="px-5 py-2 text-sm bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <HiPlus className="w-4 h-4" />
          <span>Nuevo</span>
        </button>
      </div>

      {showForm && (
        <ReminderForm
          reminder={editingReminder}
          onClose={handleFormClose}
          onSubmit={handleFormSubmit}
        />
      )}

      {/* Reminders Table */}
      {filteredReminders.length > 0 ? (
        <div className="bg-background rounded-lg border border-current/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-current/10">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">
                    Recordatorio
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">
                    Vencimiento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">
                    Prioridad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-current/5">
                {filteredReminders.map((reminder) => (
                  <tr key={reminder.id} className="hover:bg-hover-bg/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{reminder.title}</p>
                        {reminder.description && (
                          <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{reminder.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-foreground">
                        {reminder.customers?.name || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {reminder.due_date ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${isOverdue(reminder) ? 'text-red-500 font-medium' : 'text-foreground'}`}>
                            {new Date(reminder.due_date).toLocaleDateString('es-PE', { 
                              day: '2-digit', 
                              month: 'short' 
                            })}
                          </span>
                          {isOverdue(reminder) && (
                            <span className="text-xs px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded">Vencido</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-text-secondary">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                        reminder.priority === 'urgent' ? 'bg-red-500/10 text-red-500' :
                        reminder.priority === 'high' ? 'bg-orange-500/10 text-orange-500' :
                        reminder.priority === 'medium' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-gray-500/10 text-gray-500'
                      }`}>
                        {getPriorityLabel(reminder.priority)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                        reminder.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                        reminder.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500' :
                        reminder.status === 'cancelled' ? 'bg-gray-500/10 text-gray-500' :
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {getStatusLabel(reminder.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggleStatus(reminder)}
                          className="p-1.5 hover:bg-hover-bg rounded-md transition-colors"
                          title={reminder.status === 'completed' ? 'Marcar como pendiente' : 'Marcar como completado'}
                        >
                          <HiCheckCircle className={`w-4 h-4 ${reminder.status === 'completed' ? 'text-green-500' : 'text-text-secondary'}`} />
                        </button>
                        <button
                          onClick={() => handleEdit(reminder)}
                          className="p-1.5 hover:bg-hover-bg rounded-md transition-colors"
                          title="Editar"
                        >
                          <HiPencil className="w-4 h-4 text-text-secondary" />
                        </button>
                        <button
                          onClick={() => {
                            setReminderToDelete(reminder.id);
                            setDeleteModal(true);
                          }}
                          className="p-1.5 hover:bg-hover-bg rounded-md transition-colors"
                          title="Eliminar"
                        >
                          <HiTrash className="w-4 h-4 text-text-secondary hover:text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-current/5">
            <p className="text-xs text-text-secondary">
              Mostrando <span className="font-medium text-foreground">{filteredReminders.length}</span> de{' '}
              <span className="font-medium text-foreground">{reminders.length}</span> recordatorios
            </p>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-background rounded-lg border border-current/10 p-12">
          <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <HiClock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No hay recordatorios
            </h3>
            <p className="text-sm text-text-secondary mb-6">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Intenta ajustar tus filtros de búsqueda'
                : 'Comienza creando tu primer recordatorio'}
            </p>
            <button 
              onClick={() => setShowForm(true)}
              className="px-5 py-2 text-sm bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <HiPlus className="w-4 h-4" />
              <span>Crear Recordatorio</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-md w-full shadow-xl border border-current/10">
            <div className="p-5 border-b border-current/10">
              <h3 className="text-lg font-semibold text-foreground">Eliminar Recordatorio</h3>
            </div>
            <div className="p-5">
              <p className="text-sm text-text-secondary">
                ¿Estás seguro de que deseas eliminar este recordatorio? Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-current/10">
              <button
                onClick={() => setDeleteModal(false)}
                className="px-4 py-2 text-sm bg-background hover:bg-hover-bg border border-current/10 rounded-lg text-foreground font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
