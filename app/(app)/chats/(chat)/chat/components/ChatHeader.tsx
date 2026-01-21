'use client';

import { useState, useRef, useEffect } from 'react';
import { HiDotsVertical, HiShoppingCart, HiChevronLeft, HiChevronRight, HiUser, HiTag, HiClipboard, HiUserAdd } from 'react-icons/hi';
import { Badge } from 'flowbite-react';
import { ChatwootConversation } from '../api-client';
import type { ChatReferenceWithCustomer } from '@/app/types/chat-references';
import AgentAssignmentModal from './AgentAssignmentModal';
import type { ChatAssignmentDetailed } from '@/app/types/roles-agents';

interface ChatHeaderProps {
  selectedConv: ChatwootConversation;
  showContactInfo: boolean;
  setShowContactInfo: (show: boolean) => void;
  chatReference: ChatReferenceWithCustomer | null;
  setShowOrderForm: (show: boolean) => void;
  isSSEConnected: boolean;
  isPolling: boolean;
}

export default function ChatHeader({
  selectedConv,
  showContactInfo,
  setShowContactInfo,
  chatReference,
  setShowOrderForm,
  isSSEConnected,
  isPolling
}: ChatHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState<ChatAssignmentDetailed | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch current assignment
  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const response = await fetch(`/api/chat-assignments?conversation_id=${selectedConv.id}&status=active`);
        if (response.ok) {
          const assignments = await response.json();
          setCurrentAssignment(assignments[0] || null);
        }
      } catch (error) {
        console.error('Error fetching assignment:', error);
      }
    };
    fetchAssignment();
  }, [selectedConv.id]);



  // Helper function to translate conversation status
  const getConversationStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      open: 'Abierto',
      resolved: 'Resuelto',
      pending: 'Pendiente',
      snoozed: 'Pospuesto'
    };
    return statusLabels[status] || status;
  };

  return (
    <div className="px-4 py-3 border-b border-current/20 flex items-center justify-between bg-background shrink-0">
      {/* Left: Contact Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Avatar with proper aspect ratio */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 flex items-center justify-center text-white font-semibold overflow-hidden shadow-md">
            {selectedConv.meta?.sender?.thumbnail ? (
              <img
                src={selectedConv.meta.sender.thumbnail}
                alt={selectedConv.meta.sender.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm">
                {selectedConv.meta?.sender?.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            )}
          </div>
          {/* Connection indicator */}
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
              isSSEConnected || isPolling ? 'bg-green-500' : 'bg-gray-400'
            }`}
            title={isSSEConnected ? 'Conectado (SSE)' : isPolling ? 'Conectado (Polling)' : 'Desconectado'}
          />
        </div>

        {/* Contact Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground truncate">
              {selectedConv.meta?.sender?.name || 'Sin nombre'}
            </h2>
          </div>
          <p className="text-xs text-text-secondary truncate">
            {selectedConv.meta?.sender?.phone_number || selectedConv.meta?.sender?.email || 'Sin contacto'}
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Conversation Status Badge */}
        <Badge
          color={
            selectedConv.status === 'open' ? 'success' :
            selectedConv.status === 'pending' ? 'warning' :
            selectedConv.status === 'snoozed' ? 'info' : 'gray'
          }
          size="sm"
        >
          {getConversationStatusLabel(selectedConv.status)}
        </Badge>

        {/* Agent Assignment Badge/Button */}
        {currentAssignment ? (
          <button
            onClick={() => setShowAgentModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors group"
            title="Reasignar agente"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
              {currentAssignment.agent_name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <span className="text-xs font-medium text-primary hidden sm:inline">
              {currentAssignment.agent_name?.split(' ')[0] || 'Agente'}
            </span>
          </button>
        ) : (
          <button
            onClick={() => setShowAgentModal(true)}
            className="p-2 hover:bg-hover-bg rounded-lg transition-colors group"
            title="Asignar agente"
          >
            <HiUserAdd className="w-5 h-5 text-text-secondary group-hover:text-primary transition-colors" />
          </button>
        )}

        {/* Quick Action: Create Order (only if customer linked) */}
        {chatReference && (
          <button
            onClick={() => setShowOrderForm(true)}
            className="p-2 hover:bg-hover-bg rounded-lg transition-colors group hidden sm:flex"
            title="Crear pedido"
          >
            <HiShoppingCart className="w-5 h-5 text-text-secondary group-hover:text-primary transition-colors" />
          </button>
        )}

        {/* More Actions Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
            title="Más acciones"
          >
            <HiDotsVertical className="w-5 h-5 text-text-secondary" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-background border border-current/20 rounded-lg shadow-lg z-50 py-1">
              {chatReference && (
                <button
                  onClick={() => {
                    setShowOrderForm(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-hover-bg transition-colors flex items-center gap-2 sm:hidden"
                >
                  <HiShoppingCart className="w-4 h-4 text-text-secondary" />
                  <span className="text-foreground">Crear Pedido</span>
                </button>
              )}
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-hover-bg transition-colors flex items-center gap-2"
                onClick={() => setShowMenu(false)}
              >
                <HiUser className="w-4 h-4 text-text-secondary" />
                <span className="text-foreground">Ver Perfil</span>
              </button>
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-hover-bg transition-colors flex items-center gap-2"
                onClick={() => setShowMenu(false)}
              >
                <HiTag className="w-4 h-4 text-text-secondary" />
                <span className="text-foreground">Gestionar Etiquetas</span>
              </button>
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-hover-bg transition-colors flex items-center gap-2"
                onClick={() => setShowMenu(false)}
              >
                <HiClipboard className="w-4 h-4 text-text-secondary" />
                <span className="text-foreground">Copiar Info</span>
              </button>
            </div>
          )}
        </div>

        {/* Toggle Sidebar */}
        <button
          onClick={() => setShowContactInfo(!showContactInfo)}
          className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
          title={showContactInfo ? 'Ocultar panel' : 'Mostrar panel'}
        >
          {showContactInfo ? (
            <HiChevronRight className="w-5 h-5 text-text-secondary" />
          ) : (
            <HiChevronLeft className="w-5 h-5 text-text-secondary" />
          )}
        </button>
      </div>

      {/* Agent Assignment Modal */}
      <AgentAssignmentModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
        conversationId={selectedConv.id}
        currentAssignment={currentAssignment}
        onAssignmentComplete={() => {
          // Refresh assignment
          fetch(`/api/chat-assignments?conversation_id=${selectedConv.id}&status=active`)
            .then(res => res.json())
            .then(assignments => setCurrentAssignment(assignments[0] || null))
            .catch(console.error);
        }}
      />
    </div>
  );
}