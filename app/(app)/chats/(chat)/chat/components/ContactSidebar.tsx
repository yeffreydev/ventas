'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { HiPencil, HiUser, HiTag, HiViewGrid, HiShoppingCart, HiDocumentText, HiChevronDown, HiX, HiPlus, HiTrash, HiEye, HiClock, HiCheck, HiIdentification, HiLightningBolt } from 'react-icons/hi';
import { Badge, Spinner } from 'flowbite-react';
import { ChatwootConversation } from '../api-client';
import type { ChatReferenceWithCustomer } from '@/app/types/chat-references';
import type { OrderWithCustomer } from '@/app/types/orders';
import type { Reminder } from '@/app/types/reminders';
import type { ScheduledMessage } from '@/app/types/scheduled-messages';

interface ContactSidebarProps {
  selectedConv: ChatwootConversation;
  chatReference: ChatReferenceWithCustomer | null;
  loadingChatReference: boolean;
  customerTags: any[];
  loadingTags: boolean;
  customerAttributes: any[];
  loadingAttributes: boolean;
  customerOrders: OrderWithCustomer[];
  loadingOrders: boolean;
  reminders: Reminder[];
  loadingReminders: boolean;
  onUpdateReminder: (id: string, updates: any) => Promise<void>;
  onDeleteReminder: (id: string) => Promise<void>;
  showAttributeForm: boolean;
  setShowAttributeForm: (show: boolean) => void;
  newAttributeName: string;
  setNewAttributeName: (name: string) => void;
  newAttributeValue: string;
  setNewAttributeValue: (value: string) => void;
  newAttributeType: 'text' | 'number' | 'select' | 'date' | 'checkbox';
  setNewAttributeType: (type: 'text' | 'number' | 'select' | 'date' | 'checkbox') => void;
  newAttributeOptions: string;
  setNewAttributeOptions: (options: string) => void;
  editingAttributeId: string | null;
  setEditingAttributeId: (id: string | null) => void;
  handleAddAttribute: () => void;
  handleUpdateAttribute: (id: string, name: string, value: string) => void;
  handleDeleteAttribute: (id: string) => void;
  handleUnlinkCustomer: () => void;
  setShowCustomerSelector: (show: boolean) => void;
  setShowOrderForm: (show: boolean) => void;
  getOrderStatusBadge: (status: string) => React.ReactElement;
  customerAttributeDefinitions: any[];
  customerNotes: any[];
  loadingNotes: boolean;
  customerActivities: any[];
  loadingActivities: boolean;
  handleAddNote: (content: string) => void;
  handleDeleteNote: (id: string) => void;
  onViewCustomerDetails?: () => void;
  onAddTag?: (tagId: string) => Promise<void>;
  onRemoveTag?: (tagId: string, tagName: string) => Promise<void>;
  availableTags?: any[];
  onCreateReminder?: () => void;
  scheduledMessages?: ScheduledMessage[];
  loadingScheduledMessages?: boolean;
  onCreateScheduledMessage?: () => void;
  onCancelScheduledMessage?: (id: string) => void;
}

export default function ContactSidebar({
  selectedConv,
  chatReference,
  loadingChatReference,
  customerTags,
  loadingTags,
  customerAttributes,
  loadingAttributes,
  customerOrders,
  loadingOrders,
  reminders,
  loadingReminders,
  onUpdateReminder,
  onDeleteReminder,
  showAttributeForm,
  setShowAttributeForm,
  newAttributeName,
  setNewAttributeName,
  newAttributeValue,
  setNewAttributeValue,
  newAttributeType,
  setNewAttributeType,
  newAttributeOptions,
  setNewAttributeOptions,
  editingAttributeId,
  setEditingAttributeId,
  handleAddAttribute,
  handleUpdateAttribute,
  handleDeleteAttribute,
  handleUnlinkCustomer,
  setShowCustomerSelector,
  setShowOrderForm,
  getOrderStatusBadge,
  customerAttributeDefinitions,
  customerNotes,
  loadingNotes,
  customerActivities,
  loadingActivities,
  handleAddNote,
  handleDeleteNote,
  onViewCustomerDetails,
  onAddTag,
  onRemoveTag,
  availableTags = [],
  onCreateReminder,
  scheduledMessages = [],
  loadingScheduledMessages = false,
  onCreateScheduledMessage,
  onCancelScheduledMessage,
}: ContactSidebarProps) {
  const router = useRouter();
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<{ tagId: string; tagName: string } | null>(null);
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const tagsDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagsDropdownRef.current && !tagsDropdownRef.current.contains(event.target as Node)) {
        setShowTagsDropdown(false);
      }
    };

    if (showTagsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTagsDropdown]);

  const getStageLabel = (stage: string) => {
    const labels: { [key: string]: string } = {
      prospect: 'Prospecto',
      qualified: 'Calificado',
      negotiation: 'Negociación',
      customer: 'Cliente',
      inactive: 'Inactivo'
    };
    return labels[stage] || stage;
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      open: 'Abierto',
      resolved: 'Resuelto',
      pending: 'Pendiente',
      snoozed: 'Pospuesto'
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      text: 'Texto',
      number: 'Número',
      select: 'Selección',
      date: 'Fecha',
      checkbox: 'Casilla'
    };
    return labels[type] || type;
  };

  // Parse attribute value to get type info
  const parseAttributeValue = (attr: any) => {
    try {
      const stored = JSON.parse(attr.attribute_value);
      if (stored && typeof stored === 'object' && stored._type) {
        return {
          type: stored._type,
          value: stored._value || '',
          options: stored._options
        };
      }
    } catch {
      // Not JSON
    }
    return { type: 'text', value: attr.attribute_value || '', options: undefined };
  };

  return (
    <div className="w-80 bg-background border-l border-current/20 flex flex-col overflow-y-auto transition-all duration-300 shrink-0">
      {/* Contact Header */}
      <div className="p-4 border-b border-current/20 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold mb-3">
          {selectedConv.meta?.sender?.thumbnail ? (
            <img 
              src={selectedConv.meta.sender.thumbnail} 
              alt={selectedConv.meta.sender.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            selectedConv.meta?.sender?.name?.charAt(0)?.toUpperCase() || '?'
          )}
        </div>
        <div className="flex items-center justify-center gap-2">
           <h2 className="text-lg font-bold text-foreground">
             {selectedConv.meta?.sender?.name || 'Sin nombre'}
           </h2>
         </div>
        {selectedConv.meta?.sender?.phone_number && (
          <p className="text-xs text-text-secondary mt-2">
            {selectedConv.meta.sender.phone_number}
          </p>
        )}
        {selectedConv.meta?.sender?.email && (
          <p className="text-xs text-text-secondary mt-1">
            {selectedConv.meta.sender.email}
          </p>
        )}
      </div>

      {/* Expandable Sections */}
      <div className="flex-1">
        {/* Customer Information Section */}
        <AccordionSection title="Cliente" defaultOpen={true} icon={HiUser}>
          <div className="px-3 py-2">
            {loadingChatReference ? (
              <div className="text-center py-4">
                <Spinner size="sm" />
              </div>
            ) : chatReference ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{chatReference.customer_name}</p>
                    <p className="text-xs text-text-secondary mt-1">{chatReference.customer_email}</p>
                    <p className="text-xs text-text-tertiary mt-1">
                      Doc: {chatReference.customer_document}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {onViewCustomerDetails && (
                      <button
                        onClick={onViewCustomerDetails}
                        className="p-1.5 hover:bg-primary/10 rounded transition-colors"
                        title="Ver detalles del cliente"
                      >
                        <HiIdentification className="w-4 h-4 text-primary" />
                      </button>
                    )}
                    <button
                      onClick={() => setShowUnlinkModal(true)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Desvincular cliente"
                    >
                      <HiX className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-current/20">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary">Etapa:</span>
                    <Badge color="info" size="sm">{getStageLabel(chatReference.customer_stage)}</Badge>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-current/20">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary">Estado del Chat:</span>
                    <Badge color={chatReference.status === 'open' ? 'success' : 'gray'} size="sm">
                      {getStatusLabel(chatReference.status)}
                    </Badge>
                  </div>
                </div>

                {/* Create Order Button */}
                <div className="pt-3 border-t border-current/20 mt-3">
                  <button
                    onClick={() => setShowOrderForm(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/25"
                  >
                    <HiShoppingCart className="w-5 h-5" />
                    Crear Pedido
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </AccordionSection>

        {/* Call to Action Banner when no customer */}
        {!loadingChatReference && !chatReference && (
          <div className="m-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-500 mb-1">
                  Vincula un Cliente
                </h4>
                <p className="text-xs text-yellow-700 dark:text-yellow-600 mb-3">
                  Para acceder a Etiquetas, Atributos, Pedidos, Recordatorios, Notas y Actividad, primero vincula un cliente a esta conversación.
                </p>
                <button
                  onClick={() => setShowCustomerSelector(true)}
                  className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <HiUser className="w-4 h-4" />
                  Vincular Cliente Ahora
                </button>
              </div>
            </div>
          </div>
        )}

        <AccordionSection title="Información del Canal">
          <div className="px-3 py-2 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Canal:</span>
              <span className="font-medium text-foreground">{selectedConv.meta?.channel || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">ID Conversación:</span>
              <span className="font-medium text-foreground">{selectedConv.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Estado:</span>
              <Badge color={selectedConv.status === 'open' ? 'success' : 'gray'}>
                {selectedConv.status}
              </Badge>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection 
          title={`Etiquetas (${customerTags.length})`} 
          icon={HiTag}
          disabled={!chatReference}
        >
          <div className="px-3 py-2">
            {!chatReference ? (
              <div className="text-center py-4">
                <p className="text-sm text-text-secondary mb-2">
                  ⚠️ Requiere cliente vinculado
                </p>
                <p className="text-xs text-text-tertiary">
                  Vincula un cliente para gestionar etiquetas
                </p>
              </div>
            ) : loadingTags ? (
              <div className="text-center py-2">
                <Spinner size="sm" />
              </div>
            ) : (
              <>
                {customerTags.length === 0 ? (
                  <p className="text-sm text-text-secondary mb-3">
                    No hay etiquetas
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {customerTags.map((tag: any) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-hover-bg text-foreground group"
                        style={{
                          borderColor: tag.color,
                          borderWidth: '1px',
                          borderStyle: 'solid'
                        }}
                      >
                        <span>{tag.name}</span>
                        {onRemoveTag && (
                          <button
                            onClick={() => setTagToDelete({ tagId: tag.id, tagName: tag.name })}
                            className="opacity-0 group-hover:opacity-100 hover:text-red-600 dark:hover:text-red-400 transition-all"
                            title="Eliminar etiqueta"
                          >
                            <HiX className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Add Tag Dropdown */}
                {chatReference && onAddTag && (
                  <div className="relative" ref={tagsDropdownRef}>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        console.log('Toggle dropdown, current state:', showTagsDropdown);
                        console.log('Available tags:', availableTags);
                        setShowTagsDropdown(!showTagsDropdown);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                    >
                      <HiPlus className="w-4 h-4" />
                      Agregar Etiqueta
                    </button>
                    
                    {showTagsDropdown && (
                      <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-2 z-50 max-h-48 overflow-y-auto">
                        {!availableTags || availableTags.length === 0 ? (
                          <p className="text-sm text-text-secondary text-center py-2">
                            No hay etiquetas disponibles
                          </p>
                        ) : (
                          <>
                            {availableTags
                              .filter(t => !customerTags.some((ct: any) => ct.id === t.id))
                              .length > 0 ? (
                                availableTags
                                  .filter(t => !customerTags.some((ct: any) => ct.id === t.id))
                                  .map((tag) => (
                                    <button
                                      key={tag.id}
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        console.log('Adding tag:', tag);
                                        await onAddTag(tag.id);
                                        setShowTagsDropdown(false);
                                      }}
                                      className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
                                    >
                                      <span
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                        style={{
                                          borderColor: tag.color,
                                          borderWidth: '1px',
                                          borderStyle: 'solid'
                                        }}
                                      >
                                        {tag.name}
                                      </span>
                                    </button>
                                  ))
                              ) : (
                                <p className="text-sm text-text-secondary text-center py-2">
                                  Todas las etiquetas ya están agregadas
                                </p>
                              )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </AccordionSection>

        <AccordionSection title={`Atributos (${customerAttributes.length})`} icon={HiViewGrid} disabled={!chatReference}>
          <div className="px-3 py-2">
            {!chatReference ? (
              <div className="text-center py-4">
                <p className="text-sm text-text-secondary mb-2">
                  ⚠️ Requiere cliente vinculado
                </p>
                <p className="text-xs text-text-tertiary">
                  Vincula un cliente para gestionar atributos
                </p>
              </div>
            ) : loadingAttributes ? (
              <div className="text-center py-2">
                <Spinner size="sm" />
              </div>
            ) : (
              <>
                {/* Add Attribute Button */}
                {chatReference && (
                  <button
                    onClick={() => setShowAttributeForm(!showAttributeForm)}
                    className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                  >
                    <HiPlus className="w-4 h-4" />
                    Agregar Atributo
                  </button>
                )}

                {/* Add Attribute Form - WITH TYPE SELECTOR */}
                {showAttributeForm && (
                  <div className="mb-3 p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                    <input
                      type="text"
                      placeholder="Nombre del atributo"
                      value={newAttributeName}
                      onChange={(e) => setNewAttributeName(e.target.value)}
                      className="w-full px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                    
                    {/* Type Selector */}
                    <select
                      value={newAttributeType}
                      onChange={(e) => {
                        setNewAttributeType(e.target.value as any);
                        setNewAttributeValue('');
                        setNewAttributeOptions('');
                      }}
                      className="w-full px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      <option value="text">Texto</option>
                      <option value="number">Número</option>
                      <option value="date">Fecha</option>
                      <option value="select">Selección</option>
                      <option value="checkbox">Casilla (Sí/No)</option>
                    </select>

                    {/* Options for select type */}
                    {newAttributeType === 'select' && (
                      <input
                        type="text"
                        placeholder="Opciones (separar por comas)"
                        value={newAttributeOptions}
                        onChange={(e) => setNewAttributeOptions(e.target.value)}
                        className="w-full px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    )}

                    {/* Value input based on type */}
                    {newAttributeType === 'text' && (
                      <input
                        type="text"
                        placeholder="Valor"
                        value={newAttributeValue}
                        onChange={(e) => setNewAttributeValue(e.target.value)}
                        className="w-full px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    )}
                    {newAttributeType === 'number' && (
                      <input
                        type="number"
                        placeholder="Número"
                        value={newAttributeValue}
                        onChange={(e) => setNewAttributeValue(e.target.value)}
                        className="w-full px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    )}
                    {newAttributeType === 'date' && (
                      <input
                        type="date"
                        value={newAttributeValue}
                        onChange={(e) => setNewAttributeValue(e.target.value)}
                        className="w-full px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    )}
                    {newAttributeType === 'select' && (
                      <select
                        value={newAttributeValue}
                        onChange={(e) => setNewAttributeValue(e.target.value)}
                        className="w-full px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      >
                        <option value="">Seleccionar...</option>
                        {newAttributeOptions.split(',').map((opt, idx) => {
                          const trimmed = opt.trim();
                          return trimmed ? <option key={idx} value={trimmed}>{trimmed}</option> : null;
                        })}
                      </select>
                    )}
                    {newAttributeType === 'checkbox' && (
                      <div className="flex items-center gap-2 py-2">
                        <input
                          type="checkbox"
                          id="new-attr-checkbox-sidebar"
                          checked={newAttributeValue === 'true'}
                          onChange={(e) => setNewAttributeValue(e.target.checked ? 'true' : 'false')}
                          className="w-4 h-4 text-primary bg-input-bg border-input-border rounded focus:ring-primary"
                        />
                        <label htmlFor="new-attr-checkbox-sidebar" className="text-sm text-foreground">
                          {newAttributeValue === 'true' ? 'Sí' : 'No'}
                        </label>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handleAddAttribute}
                        className="flex-1 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => {
                          setShowAttributeForm(false);
                          setNewAttributeName('');
                          setNewAttributeValue('');
                          setNewAttributeType('text');
                          setNewAttributeOptions('');
                        }}
                        className="px-3 py-1.5 border border-current/20 rounded-lg hover:bg-hover-bg transition-colors text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Attributes List - WITH TYPE DISPLAY */}
                {customerAttributes.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    No hay atributos personalizados
                  </p>
                ) : (
                  <div className="space-y-2">
                    {customerAttributes.map((attr: any) => {
                      const parsed = parseAttributeValue(attr);
                      return (
                        <div
                          key={attr.id}
                          className="p-2 rounded-lg border border-current/20 bg-hover-bg"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-1">
                                <p className="text-xs font-semibold text-foreground truncate">
                                  {attr.attribute_name}
                                </p>
                                <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                                  {getTypeLabel(parsed.type)}
                                </span>
                              </div>
                              <p className="text-xs text-text-secondary break-words">
                                {parsed.type === 'checkbox' 
                                  ? (parsed.value === 'true' ? '✓ Sí' : '✗ No')
                                  : parsed.type === 'date' && parsed.value
                                  ? new Date(parsed.value).toLocaleDateString('es-ES')
                                  : parsed.value || '-'}
                              </p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleDeleteAttribute(attr.id)}
                                className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              >
                                <HiTrash className="w-3 h-3 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </AccordionSection>

        <AccordionSection title={`Pedidos (${customerOrders.length})`} icon={HiShoppingCart} disabled={!chatReference}>
          <div className="px-3 py-2">
            {!chatReference ? (
              <div className="text-center py-4">
                <p className="text-sm text-text-secondary mb-2">
                  ⚠️ Requiere cliente vinculado
                </p>
                <p className="text-xs text-text-tertiary">
                  Vincula un cliente para ver pedidos
                </p>
              </div>
            ) : loadingOrders ? (
              <div className="text-center py-2">
                <Spinner size="sm" />
              </div>
            ) : (
              <>
                {/* Create Order Button */}
                <button
                  onClick={() => setShowOrderForm(true)}
                  className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                >
                  <HiPlus className="w-4 h-4" />
                  Crear Pedido
                </button>

                {customerOrders.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    No hay pedidos registrados
                  </p>
                ) : (
                  <div className="space-y-2">
                    {customerOrders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="p-3 rounded-lg border border-current/20 bg-background hover:bg-hover-bg transition-colors cursor-pointer"
                        onClick={() => router.push(`/orders/${order.id}`)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {order.order_number}
                            </p>
                            <p className="text-xs text-text-secondary mt-0.5">
                              {new Date(order.order_date).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/orders/${order.id}`);
                            }}
                            className="p-1 hover:bg-primary/10 rounded transition-colors"
                            title="Ver detalles"
                          >
                            <HiEye className="w-4 h-4 text-primary" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-foreground">
                            ${order.total_amount.toFixed(2)}
                          </span>
                          {getOrderStatusBadge(order.status)}
                        </div>
                      </div>
                    ))}
                    {customerOrders.length > 5 && (
                      <button
                        onClick={() => router.push(`/orders?customer_id=${chatReference?.customer_id}`)}
                        className="w-full mt-2 px-3 py-2 text-xs text-primary hover:bg-primary/10 rounded-lg transition-colors font-medium"
                      >
                        Ver todos los pedidos ({customerOrders.length})
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </AccordionSection>

        <AccordionSection title={`Recordatorios (${reminders.length})`} icon={HiClock} disabled={!chatReference}>
          <div className="px-3 py-2">
            {!chatReference ? (
              <div className="text-center py-4">
                <p className="text-sm text-text-secondary mb-2">
                  ⚠️ Requiere cliente vinculado
                </p>
                <p className="text-xs text-text-tertiary">
                  Vincula un cliente para crear recordatorios
                </p>
              </div>
            ) : loadingReminders ? (
              <div className="text-center py-2">
                <Spinner size="sm" />
              </div>
            ) : (
              <>
                {/* Create Reminder Button */}
                {onCreateReminder && (
                  <button
                    onClick={onCreateReminder}
                    className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                  >
                    <HiPlus className="w-4 h-4" />
                    Crear Recordatorio
                  </button>
                )}

                {reminders.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    No hay recordatorios. Crea uno nuevo.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {reminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          reminder.status === 'completed'
                            ? 'border-green-200 bg-green-50 dark:bg-green-900/10'
                            : 'border-current/20 bg-background hover:bg-hover-bg'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${
                              reminder.status === 'completed' ? 'line-through text-text-secondary' : 'text-foreground'
                            }`}>
                              {reminder.title}
                            </p>
                            {reminder.description && (
                              <p className="text-xs text-text-secondary mt-1">
                                {reminder.description}
                              </p>
                            )}
                            {reminder.due_date && (
                              <p className="text-xs text-text-tertiary mt-1">
                                Vence: {new Date(reminder.due_date).toLocaleDateString('es-ES', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {reminder.status !== 'completed' && (
                              <button
                                onClick={() => onUpdateReminder(reminder.id, { status: 'completed' })}
                                className="p-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                title="Marcar como completado"
                              >
                                <HiCheck className="w-4 h-4 text-green-600" />
                              </button>
                            )}
                            <button
                              onClick={() => onDeleteReminder(reminder.id)}
                              className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Eliminar"
                            >
                              <HiTrash className="w-3 h-3 text-red-600" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            color={
                              reminder.priority === 'urgent' ? 'failure' :
                              reminder.priority === 'high' ? 'warning' :
                              reminder.priority === 'medium' ? 'info' : 'gray'
                            }
                            size="sm"
                          >
                            {reminder.priority === 'urgent' ? 'Urgente' :
                             reminder.priority === 'high' ? 'Alta' :
                             reminder.priority === 'medium' ? 'Media' : 'Baja'}
                          </Badge>
                          <Badge
                            color={
                              reminder.status === 'completed' ? 'success' :
                              reminder.status === 'in_progress' ? 'info' : 'gray'
                            }
                            size="sm"
                          >
                            {reminder.status === 'completed' ? 'Completado' :
                             reminder.status === 'in_progress' ? 'En progreso' :
                             reminder.status === 'cancelled' ? 'Cancelado' : 'Pendiente'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </AccordionSection>

        <AccordionSection title={`Mensajes Programados (${scheduledMessages.length})`} icon={HiClock} disabled={!chatReference}>
          <div className="px-3 py-2">
            {!chatReference ? (
              <div className="text-center py-4">
                <p className="text-sm text-text-secondary mb-2">
                  ⚠️ Requiere cliente vinculado
                </p>
                <p className="text-xs text-text-tertiary">
                  Vincula un cliente para programar mensajes
                </p>
              </div>
            ) : loadingScheduledMessages ? (
              <div className="text-center py-2">
                <Spinner size="sm" />
              </div>
            ) : (
              <>
                {/* Create Scheduled Message Button */}
                {onCreateScheduledMessage && (
                  <button
                    onClick={onCreateScheduledMessage}
                    className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                  >
                    <HiPlus className="w-4 h-4" />
                    Programar Mensaje
                  </button>
                )}

                {scheduledMessages.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    No hay mensajes programados.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(() => {
                      const now = new Date();
                      // Sort: pending future first (furthest first), then recent sent/processed, then failed/expired
                      const sortedMessages = [...scheduledMessages].sort((a, b) => {
                        const aDate = new Date(a.scheduled_at);
                        const bDate = new Date(b.scheduled_at);
                        const aIsPending = a.status === 'pending' || a.status === 'queued';
                        const bIsPending = b.status === 'pending' || b.status === 'queued';
                        const aIsFuture = aDate > now;
                        const bIsFuture = bDate > now;
                        
                        // Pending future messages first (furthest date first)
                        if (aIsPending && aIsFuture && (!bIsPending || !bIsFuture)) return -1;
                        if (bIsPending && bIsFuture && (!aIsPending || !aIsFuture)) return 1;
                        if (aIsPending && aIsFuture && bIsPending && bIsFuture) {
                          return bDate.getTime() - aDate.getTime(); // Furthest first
                        }
                        
                        // Then sent/processing (most recent first)
                        if (a.status === 'sent' && b.status !== 'sent') return -1;
                        if (b.status === 'sent' && a.status !== 'sent') return 1;
                        
                        // By date descending for the rest
                        return bDate.getTime() - aDate.getTime();
                      });
                      
                      const displayMessages = sortedMessages.slice(0, 5);
                      const remainingCount = scheduledMessages.length - 5;
                      
                      return (
                        <>
                          {displayMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`p-3 rounded-lg border transition-colors ${
                                msg.status === 'sent'
                                  ? 'border-green-200 bg-green-50 dark:bg-green-900/10'
                                  : msg.status === 'failed'
                                  ? 'border-red-200 bg-red-50 dark:bg-red-900/10'
                                  : 'border-current/20 bg-background hover:bg-hover-bg'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm ${
                                    msg.status === 'sent' ? 'text-text-secondary' : 'text-foreground'
                                  }`}>
                                    {msg.message.length > 50 ? msg.message.substring(0, 50) + '...' : msg.message}
                                  </p>
                                  <p className="text-xs text-text-tertiary mt-1">
                                    {new Date(msg.scheduled_at).toLocaleDateString('es-ES', {
                                      day: '2-digit',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                                {msg.status === 'pending' && onCancelScheduledMessage && (
                                  <button
                                    onClick={() => onCancelScheduledMessage(msg.id)}
                                    className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                    title="Cancelar"
                                  >
                                    <HiX className="w-3 h-3 text-red-600" />
                                  </button>
                                )}
                              </div>
                              <Badge
                                color={
                                  msg.status === 'sent' ? 'success' :
                                  msg.status === 'failed' ? 'failure' :
                                  msg.status === 'cancelled' ? 'gray' :
                                  msg.status === 'processing' || msg.status === 'queued' ? 'info' : 'warning'
                                }
                                size="sm"
                              >
                                {msg.status === 'sent' ? 'Enviado' :
                                 msg.status === 'failed' ? 'Error' :
                                 msg.status === 'cancelled' ? 'Cancelado' :
                                 msg.status === 'processing' ? 'Procesando' :
                                 msg.status === 'queued' ? 'En cola' : 'Pendiente'}
                              </Badge>
                            </div>
                          ))}
                          {remainingCount > 0 && (
                            <button
                              onClick={() => router.push('/scheduled-messages')}
                              className="w-full mt-2 px-3 py-2 text-xs text-primary hover:bg-primary/10 rounded-lg transition-colors font-medium flex items-center justify-center gap-1"
                            >
                              <span>+{remainingCount} más</span>
                              <span className="text-text-tertiary">• Ver todos</span>
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </>
            )}
          </div>
        </AccordionSection>

        <AccordionSection title={`Notas (${customerNotes.length})`} icon={HiDocumentText} disabled={!chatReference}>
          <div className="px-3 py-2">
            {!chatReference ? (
              <div className="text-center py-4">
                <p className="text-sm text-text-secondary mb-2">
                  ⚠️ Requiere cliente vinculado
                </p>
                <p className="text-xs text-text-tertiary">
                  Vincula un cliente para agregar notas
                </p>
              </div>
            ) : loadingNotes ? (
              <div className="text-center py-2">
                <Spinner size="sm" />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Add Note Input */}
                {chatReference && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Agregar nota..."
                      className="flex-1 px-3 py-1.5 border border-current/20 rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const target = e.target as HTMLInputElement;
                          if (target.value.trim()) {
                            handleAddNote(target.value);
                            target.value = '';
                          }
                        }
                      }}
                    />
                  </div>
                )}

                {/* Notes List */}
                {customerNotes.length === 0 ? (
                  <p className="text-sm text-text-secondary">No hay notas</p>
                ) : (
                  <div className="space-y-2">
                    {customerNotes.map((note) => (
                      <div key={note.id} className="p-2 rounded-lg border border-current/20 bg-background hover:bg-hover-bg group">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                          >
                            <HiTrash className="w-3 h-3 text-red-600" />
                          </button>
                        </div>
                        <p className="text-[10px] text-text-tertiary mt-1">
                          {new Date(note.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </AccordionSection>

        {/* Activity Section */}
        <AccordionSection title="Actividad Reciente" icon={HiLightningBolt} disabled={!chatReference}>
          <div className="px-3 py-2">
            {!chatReference ? (
              <div className="text-center py-4">
                <p className="text-sm text-text-secondary mb-2">
                  ⚠️ Requiere cliente vinculado
                </p>
                <p className="text-xs text-text-tertiary">
                  Vincula un cliente para ver actividad
                </p>
              </div>
            ) : (() => {
              // Combine all activities
              const activities: Array<{
                id: string;
                type: 'note' | 'order' | 'reminder';
                title: string;
                description?: string;
                timestamp: Date;
                priority?: string;
                status?: string;
                amount?: number;
              }> = [];

              // Add recent notes (last 7 days)
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              customerNotes.forEach(note => {
                if (new Date(note.created_at) >= sevenDaysAgo) {
                  activities.push({
                    id: `note-${note.id}`,
                    type: 'note',
                    title: 'Nueva nota añadida',
                    description: note.content,
                    timestamp: new Date(note.created_at)
                  });
                }
              });

              // Add recent orders (last 24h)
              const last24Hours = new Date();
              last24Hours.setHours(last24Hours.getHours() - 24);
              customerOrders.forEach(order => {
                if (new Date(order.created_at) >= last24Hours) {
                  activities.push({
                    id: `order-${order.id}`,
                    type: 'order',
                    title: 'Nuevo pedido creado',
                    description: order.order_number,
                    timestamp: new Date(order.created_at),
                    status: order.status,
                    amount: order.total_amount
                  });
                }
              });

              // Add urgent reminders (next hour)
              const now = new Date();
              const inOneHour = new Date(now.getTime() + 60 * 60000);
              reminders.forEach(reminder => {
                if (reminder.due_date && reminder.status !== 'completed') {
                  const dueDate = new Date(reminder.due_date);
                  if (dueDate >= now && dueDate <= inOneHour) {
                    const minutesLeft = Math.floor((dueDate.getTime() - now.getTime()) / 60000);
                    activities.push({
                      id: `reminder-${reminder.id}`,
                      type: 'reminder',
                      title: reminder.title,
                      description: `En ${minutesLeft} minutos`,
                      timestamp: dueDate,
                      priority: reminder.priority
                    });
                  }
                }
              });

              // Sort by timestamp (most recent first)
              activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

              return activities.length === 0 ? (
                <div className="text-center py-6">
                  <HiLightningBolt className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                  <p className="text-sm text-text-secondary">
                    Sin actividad reciente
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">
                    No hay notas, pedidos o recordatorios recientes
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activities.slice(0, 10).map(activity => (
                    <div
                      key={activity.id}
                      className={`p-2.5 rounded-lg border ${
                        activity.type === 'note' ? 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700' :
                        activity.type === 'order' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' :
                        'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`p-1.5 rounded-full flex-shrink-0 ${
                          activity.type === 'note' ? 'bg-gray-200 dark:bg-gray-700' :
                          activity.type === 'order' ? 'bg-blue-200 dark:bg-blue-700' :
                          'bg-orange-200 dark:bg-orange-700'
                        }`}>
                          {activity.type === 'note' ? (
                            <HiDocumentText className="w-3 h-3 text-gray-700 dark:text-gray-200" />
                          ) : activity.type === 'order' ? (
                            <HiShoppingCart className="w-3 h-3 text-blue-700 dark:text-blue-200" />
                          ) : (
                            <HiClock className="w-3 h-3 text-orange-700 dark:text-orange-200" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${
                            activity.type === 'reminder' && activity.priority === 'urgent' ? 'text-red-600 dark:text-red-500' :
                            activity.type === 'reminder' && activity.priority === 'high' ? 'text-orange-600 dark:text-orange-500' :
                            'text-foreground'
                          }`}>
                            {activity.title}
                            {activity.type === 'reminder' && activity.priority === 'urgent' && ' - ¡URGENTE!'}
                            {activity.type === 'reminder' && activity.priority === 'high' && ' - Alta prioridad'}
                          </p>
                          {activity.description && (
                            <p className={`text-xs mt-0.5 ${
                              activity.type === 'note' ? 'text-text-secondary line-clamp-2' :
                              activity.type === 'order' ? 'text-blue-700 dark:text-blue-400 font-medium' :
                              'text-orange-700 dark:text-orange-400 font-medium'
                            }`}>
                              {activity.description}
                              {activity.type === 'order' && activity.amount && ` - $${activity.amount.toFixed(2)}`}
                            </p>
                          )}
                          <p className="text-[10px] text-text-tertiary mt-1">
                            {activity.timestamp.toLocaleString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </AccordionSection>
      </div>

      {/* Delete Tag Confirmation Modal */}
      {tagToDelete && onRemoveTag && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl max-w-md w-full shadow-2xl border border-current/20 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20">
                <svg className="w-8 h-8 text-red-600 dark:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-center text-foreground mb-2">
                ¿Eliminar etiqueta?
              </h3>
              <p className="text-center text-text-secondary mb-6">
                Estás a punto de eliminar la etiqueta <span className="font-semibold text-foreground">"{tagToDelete.tagName}"</span> de este cliente. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setTagToDelete(null)}
                  className="flex-1 px-4 py-2.5 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-foreground font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await onRemoveTag(tagToDelete.tagId, tagToDelete.tagName);
                    setTagToDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-red-600/25"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unlink Customer Confirmation Modal */}
      {showUnlinkModal && chatReference && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl max-w-md w-full shadow-2xl border border-current/20 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20">
                <svg className="w-8 h-8 text-red-600 dark:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-center text-foreground mb-2">
                ¿Desvincular cliente?
              </h3>
              <p className="text-center text-text-secondary mb-2">
                Estás a punto de desvincular a
              </p>
              <p className="text-center font-semibold text-foreground mb-6">
                {chatReference.customer_name}
              </p>
              <p className="text-center text-sm text-text-tertiary mb-6">
                Esta acción eliminará la vinculación entre este chat y el cliente. Los datos del cliente no se borrarán.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUnlinkModal(false)}
                  className="flex-1 px-4 py-2.5 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-foreground font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    handleUnlinkCustomer();
                    setShowUnlinkModal(false);
                  }}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-red-600/25"
                >
                  Desvincular
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Tag Confirmation Modal */}
      {tagToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl max-w-md w-full shadow-2xl border border-current/20 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20">
                <svg className="w-8 h-8 text-red-600 dark:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-center text-foreground mb-2">
                ¿Eliminar etiqueta?
              </h3>
              <p className="text-center text-text-secondary mb-6">
                Estás a punto de eliminar la etiqueta <span className="font-semibold text-foreground">"{tagToDelete.tagName}"</span>. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setTagToDelete(null)}
                  className="flex-1 px-4 py-2.5 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-foreground font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (onRemoveTag) {
                      await onRemoveTag(tagToDelete.tagId, tagToDelete.tagName);
                    }
                    setTagToDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-red-600/25"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Accordion Section Component
function AccordionSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  disabled = false
}: {
  title: string;
  icon?: any;
  children: React.ReactNode;
  defaultOpen?: boolean;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border-b border-current/20 ${disabled ? 'opacity-50' : ''}`}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2.5 flex items-center justify-between text-left transition-colors ${
          disabled ? 'cursor-not-allowed' : 'hover:bg-hover-bg'
        }`}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${disabled ? 'text-gray-400' : 'text-text-secondary'}`} />}
          <span className={`text-xs font-semibold ${disabled ? 'text-gray-400' : 'text-foreground'}`}>{title}</span>
        </div>
        <HiChevronDown
          className={`w-4 h-4 transition-transform ${
            disabled ? 'text-gray-400' : 'text-text-tertiary'
          } ${isOpen ? 'transform rotate-180' : ''}`}
        />
      </button>
      {isOpen && !disabled && <div className="bg-hover-bg">{children}</div>}
    </div>
  );
}
