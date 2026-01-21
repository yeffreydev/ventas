'use client';

import { useState, useEffect } from 'react';
import { HiX, HiUserAdd, HiUsers } from 'react-icons/hi';
import type { ActiveAgent, ChatAssignmentDetailed } from '@/app/types/roles-agents';

interface AgentAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number;
  currentAssignment?: ChatAssignmentDetailed | null;
  onAssignmentComplete?: () => void;
}

export default function AgentAssignmentModal({
  isOpen,
  onClose,
  conversationId,
  currentAssignment,
  onAssignmentComplete,
}: AgentAssignmentModalProps) {
  const [agents, setAgents] = useState<ActiveAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAgents();
      if (currentAssignment) {
        setSelectedAgentId(currentAssignment.agent_id);
        setNotes(currentAssignment.notes || '');
      }
    }
  }, [isOpen, currentAssignment]);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents?active_only=true');
      if (!response.ok) throw new Error('Failed to fetch agents');
      const data = await response.json();
      setAgents(data);
    } catch (err) {
      console.error('Error fetching agents:', err);
      setError('Error al cargar agentes');
    }
  };

  const handleAssign = async () => {
    if (!selectedAgentId) {
      setError('Por favor selecciona un agente');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          agent_id: selectedAgentId,
          notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign agent');
      }

      onAssignmentComplete?.();
      onClose();
    } catch (err: any) {
      console.error('Error assigning agent:', err);
      setError(err.message || 'Error al asignar agente');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassign = async () => {
    if (!currentAssignment) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/chat-assignments?conversation_id=${conversationId}&agent_id=${currentAssignment.agent_id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unassign agent');
      }

      onAssignmentComplete?.();
      onClose();
    } catch (err: any) {
      console.error('Error unassigning agent:', err);
      setError(err.message || 'Error al desasignar agente');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-current/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <HiUserAdd className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {currentAssignment ? 'Reasignar Agente' : 'Asignar Agente'}
              </h2>
              <p className="text-xs text-text-secondary">
                Conversación #{conversationId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
          >
            <HiX className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Current Assignment Info */}
          {currentAssignment && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                  {currentAssignment.agent_name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Asignado actualmente a
                  </p>
                  <p className="text-xs text-text-secondary">
                    {currentAssignment.agent_name || 'Agente desconocido'}
                  </p>
                </div>
              </div>
              {currentAssignment.notes && (
                <p className="text-xs text-text-secondary mt-2">
                  Nota: {currentAssignment.notes}
                </p>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Agent Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Seleccionar Agente
            </label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            >
              <option value="">-- Selecciona un agente --</option>
              {agents.map((agent) => (
                <option key={agent.user_id} value={agent.user_id}>
                  {agent.display_name || agent.user_display_name || agent.email} 
                  {agent.status === 'available' && ` (${agent.current_chat_count}/${agent.max_concurrent_chats} chats)`}
                  {agent.status === 'busy' && ' (Ocupado)'}
                </option>
              ))}
            </select>
          </div>

          {/* Agent Details */}
          {selectedAgentId && agents.find(a => a.user_id === selectedAgentId) && (
            <div className="p-3 bg-hover-bg rounded-lg">
              {(() => {
                const agent = agents.find(a => a.user_id === selectedAgentId)!;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">Estado:</span>
                      <span className={`text-xs font-medium ${
                        agent.status === 'available' ? 'text-green-600 dark:text-green-400' :
                        agent.status === 'busy' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-gray-600 dark:text-gray-400'
                      }`}>
                        {agent.status === 'available' ? 'Disponible' :
                         agent.status === 'busy' ? 'Ocupado' : 'Desconectado'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">Chats activos:</span>
                      <span className="text-xs font-medium text-foreground">
                        {agent.current_chat_count} / {agent.max_concurrent_chats}
                      </span>
                    </div>
                    {agent.specialties && agent.specialties.length > 0 && (
                      <div>
                        <span className="text-xs text-text-secondary">Especialidades:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {agent.specialties.map((specialty, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                            >
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agrega notas sobre esta asignación..."
              className="w-full px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-current/20 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {currentAssignment && (
              <button
                onClick={handleUnassign}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
              >
                Desasignar
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-hover-bg rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAssign}
              disabled={isLoading || !selectedAgentId}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Asignando...
                </>
              ) : (
                <>
                  <HiUserAdd className="w-4 h-4" />
                  {currentAssignment ? 'Reasignar' : 'Asignar'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}