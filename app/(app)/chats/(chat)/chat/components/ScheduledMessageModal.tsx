'use client';

import { useState } from 'react';
import { HiX, HiClock, HiExclamationCircle } from 'react-icons/hi';

interface ScheduledMessageModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (data: { message: string; scheduled_at: string; channel: string }) => void;
}

export default function ScheduledMessageModal({ show, onClose, onSave }: ScheduledMessageModalProps) {
  // Get default date and time (current time in local timezone)
  const getDefaultDateTime = () => {
    const now = new Date();
    
    const date = now.toISOString().split('T')[0];
    let hours = now.getHours();
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minutes = now.getMinutes();
    
    return { date, hours, minutes, period };
  };
  
  const defaultDateTime = getDefaultDateTime();
  
  const [message, setMessage] = useState('');
  const [scheduledDate, setScheduledDate] = useState(defaultDateTime.date);
  const [scheduledHour, setScheduledHour] = useState(defaultDateTime.hours);
  const [scheduledMinute, setScheduledMinute] = useState(defaultDateTime.minutes);
  const [scheduledPeriod, setScheduledPeriod] = useState<'AM' | 'PM'>(defaultDateTime.period as 'AM' | 'PM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Convert to ISO string with timezone for the server
  const getScheduledAtISO = () => {
    let hours = scheduledHour;
    if (scheduledPeriod === 'PM' && hours !== 12) {
      hours += 12;
    } else if (scheduledPeriod === 'AM' && hours === 12) {
      hours = 0;
    }
    
    // Create date in local timezone and convert to ISO
    const localDate = new Date(
      parseInt(scheduledDate.split('-')[0]),
      parseInt(scheduledDate.split('-')[1]) - 1,
      parseInt(scheduledDate.split('-')[2]),
      hours,
      scheduledMinute,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !message.trim()) return;
    
    setError(null);
    
    if (!validateDateTime()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSave({
        message: message.trim(),
        scheduled_at: getScheduledAtISO(),
        channel: 'whatsapp',
      });
      setMessage('');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al programar el mensaje');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) return null;

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

      {/* Main Modal */}
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-background rounded-2xl max-w-md w-full shadow-2xl border border-current/20">
          {/* Header */}
          <div className="p-4 border-b border-current/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HiClock className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Programar Mensaje</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-hover-bg rounded-lg transition-colors">
              <HiX className="w-5 h-5" />
            </button>
          </div>
          
          {/* Body */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Mensaje *
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe tu mensaje..."
                required
                rows={3}
                className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
            
            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Fecha *
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            {/* Time */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Hora *
              </label>
              <div className="flex gap-2 items-center">
                <select
                  value={scheduledHour}
                  onChange={(e) => setScheduledHour(parseInt(e.target.value))}
                  className="flex-1 px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span className="font-bold">:</span>
                <select
                  value={scheduledMinute}
                  onChange={(e) => setScheduledMinute(parseInt(e.target.value))}
                  className="w-20 px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                  ))}
                </select>
                <div className="flex rounded-lg border border-input-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setScheduledPeriod('AM')}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${scheduledPeriod === 'AM' ? 'bg-primary text-white' : 'bg-input-bg text-foreground hover:bg-hover-bg'}`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduledPeriod('PM')}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${scheduledPeriod === 'PM' ? 'bg-primary text-white' : 'bg-input-bg text-foreground hover:bg-hover-bg'}`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>
          </form>
          
          {/* Footer */}
          <div className="p-4 border-t border-current/20 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-current/20 rounded-lg hover:bg-hover-bg transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !message.trim()}
              className={`flex-1 px-4 py-2 bg-primary text-white rounded-lg transition-colors font-medium ${isSubmitting || !message.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90'}`}
            >
              {isSubmitting ? 'Programando...' : 'Programar'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
