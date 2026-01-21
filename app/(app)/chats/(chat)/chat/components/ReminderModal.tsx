'use client';

import { useState } from 'react';
import { Modal, Button, Textarea, Select } from 'flowbite-react';

interface ReminderModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (reminderData: {
    title: string;
    description?: string;
    due_date?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  }) => Promise<void>;
  initialContent?: string;
}

export default function ReminderModal({
  show,
  onClose,
  onSave,
  initialContent = ''
}: ReminderModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState(initialContent);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      alert('El título es requerido');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate || undefined,
        priority
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('medium');
      onClose();
    } catch (error) {
      console.error('Error saving reminder:', error);
      alert('Error al guardar el recordatorio');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('medium');
      onClose();
    }
  };

  return (
    <Modal show={show} onClose={handleClose} size="md">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-foreground">Crear Recordatorio</h3>
        </div>
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="reminder-title" className="block mb-2 text-sm font-medium text-foreground">
              Título *
            </label>
            <input
              id="reminder-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Llamar al cliente"
              className="mt-1 w-full px-3 py-2 bg-input-bg border border-input-border text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              disabled={saving}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="reminder-description" className="block mb-2 text-sm font-medium text-foreground">
              Descripción
            </label>
            <Textarea
              id="reminder-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles adicionales..."
              rows={3}
              className="mt-1"
              disabled={saving}
            />
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="reminder-due-date" className="block mb-2 text-sm font-medium text-foreground">
              Fecha de vencimiento
            </label>
            <input
              id="reminder-due-date"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-input-bg border border-input-border text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              disabled={saving}
            />
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="reminder-priority" className="block mb-2 text-sm font-medium text-foreground">
              Prioridad
            </label>
            <Select
              id="reminder-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="mt-1"
              disabled={saving}
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 mt-6 justify-end">
          <Button color="gray" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}