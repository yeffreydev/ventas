'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import {
  HiTrash,
  HiPencil,
  HiPlus,
  HiChat,
  HiDotsHorizontal,
  HiSearch,
  HiDownload,
  HiUser,
  HiUserGroup,
  HiTrendingUp,
  HiCheckCircle,
  HiX
} from 'react-icons/hi';
import { Spinner, Badge } from 'flowbite-react';
import CustomerForm from './CustomerForm';
import CustomerChatsModal from './CustomerChatsModal';
import { useWorkspace } from '@/app/providers/WorkspaceProvider';

interface Customer {
  id: string;
  name: string;
  identity_document_type: string;
  identity_document_number: string;
  email: string;
  phone?: string;
  city: string;
  province: string;
  district: string;
  address: string;
  stage: string;
  created_at: string;
  customer_tags?: Array<{
    tag_id: string;
    tags: {
      id: string;
      name: string;
      color: string;
    };
  }>;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

export default function CustomersTable() {
  const { currentWorkspace } = useWorkspace();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [showChatsModal, setShowChatsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [expandedTagsRow, setExpandedTagsRow] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [editingTagsCustomer, setEditingTagsCustomer] = useState<Customer | null>(null);
  const [tagToDelete, setTagToDelete] = useState<{ customerId: string; tagId: string; tagName: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (currentWorkspace) {
      fetchCustomers();
    }
  }, [currentWorkspace]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setExpandedTagsRow(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCustomers = async () => {
    if (!currentWorkspace) return;

    try {
      setLoading(true);
      console.log('[fetchCustomers] Fetching for workspace:', currentWorkspace.id);
      
      const response = await fetch(`/api/customers?workspace_id=${currentWorkspace.id}`);

      if (!response.ok) {
        const error = await response.json();
        console.error('[fetchCustomers] Error response:', error);
        throw new Error(error.error || 'Error fetching customers');
      }

      const data = await response.json();
      console.log('[fetchCustomers] Fetched customers:', data.length);
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };



  const handleDelete = async () => {
    if (!customerToDelete || !currentWorkspace) return;

    try {
      console.log('[handleDelete] Deleting customer:', customerToDelete);
      
      const response = await fetch(`/api/customers/${customerToDelete}?workspace_id=${currentWorkspace.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[handleDelete] Error response:', error);
        throw new Error(error.error || 'Error deleting customer');
      }

      setCustomers(customers.filter(c => c.id !== customerToDelete));
      setDeleteModal(false);
      setCustomerToDelete(null);
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Error al eliminar cliente');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCustomer(null);
  };

  const handleFormSubmit = async () => {
    await fetchCustomers();
    handleFormClose();
  };

  const handleDeleteTag = async () => {
    if (!tagToDelete || !currentWorkspace) return;

    try {
      const response = await fetch(`/api/customers/${tagToDelete.customerId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          action: 'remove_tag',
          tag_id: tagToDelete.tagId
        })
      });

      if (!response.ok) {
        throw new Error('Error al eliminar etiqueta');
      }

      await fetchCustomers();
      setTagToDelete(null);
    } catch (error) {
      console.error('Error deleting tag:', error);
      alert('Error al eliminar la etiqueta');
    }
  };

  const getStageColor = (stage: string): 'info' | 'success' | 'warning' | 'failure' | 'purple' | 'gray' => {
    const colors: { [key: string]: 'info' | 'success' | 'warning' | 'failure' | 'purple' | 'gray' } = {
      prospect: 'info',
      qualified: 'success',
      negotiation: 'warning',
      customer: 'purple',
      inactive: 'gray'
    };
    return colors[stage] || 'gray';
  };

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

  // Filter customers
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.identity_document_number.includes(searchTerm);
    const matchesStage = stageFilter === 'all' || customer.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  // Calculate stats
  const stats = [
    {
      title: 'Total Clientes',
      value: customers.length.toString(),
      change: '+12%',
      icon: HiUserGroup,
      color: 'text-primary'
    },
    {
      title: 'Prospectos',
      value: customers.filter(c => c.stage === 'prospect').length.toString(),
      change: '+8%',
      icon: HiUser,
      color: 'text-blue-500'
    },
    {
      title: 'Calificados',
      value: customers.filter(c => c.stage === 'qualified').length.toString(),
      change: '+15%',
      icon: HiTrendingUp,
      color: 'text-green-500'
    },
    {
      title: 'Clientes Activos',
      value: customers.filter(c => c.stage === 'customer').length.toString(),
      change: '+10%',
      icon: HiCheckCircle,
      color: 'text-purple-500'
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner aria-label="Cargando clientes" size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm md:text-base text-text-secondary mt-1">Gestiona y monitorea todos tus clientes</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-background rounded-xl p-6 border border-current/20 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-2">{stat.value}</p>
                  <p className="text-sm text-green-500 mt-1">{stat.change} vs mes anterior</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10">
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions Bar */}
        <div className="bg-background rounded-xl p-3 md:p-4 border border-current/20">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              {/* Search */}
              <div className="relative flex-1">
                <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Buscar clientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 md:pl-10 pr-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm md:text-base text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Filter */}
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="px-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm md:text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-auto"
              >
                <option value="all">Todas las etapas</option>
                <option value="prospect">Prospecto</option>
                <option value="qualified">Calificado</option>
                <option value="negotiation">Negociación</option>
                <option value="customer">Cliente</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button className="flex-1 sm:flex-none px-4 py-2.5 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-sm md:text-base text-foreground font-medium transition-colors flex items-center justify-center gap-2 touch-manipulation">
                <HiDownload className="w-4 h-4" />
                <span>Exportar</span>
              </button>
              <button 
                onClick={() => setShowForm(true)}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm md:text-base font-medium transition-colors flex items-center justify-center gap-2 touch-manipulation"
              >
                <HiPlus className="w-4 h-4" />
                <span>Nuevo Cliente</span>
              </button>
            </div>
          </div>
        </div>

        {showForm && (
          <CustomerForm
            customer={editingCustomer}
            onClose={handleFormClose}
            onSubmit={handleFormSubmit}
          />
        )}

        {/* Customers Table */}
        {filteredCustomers.length > 0 ? (
          <div className="bg-background rounded-xl border border-current/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-hover-bg">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Documento
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Correo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Teléfono
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Ciudad
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Etapa
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider w-48">
                      Etiquetas
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-hover-bg transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                              {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{customer.name}</p>
                              <p className="text-xs text-text-secondary">{customer.city || 'Sin ciudad'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-foreground">
                            {customer.identity_document_type}: {customer.identity_document_number}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-foreground">{customer.email}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-foreground">{customer.phone || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-foreground">{customer.city || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge color={getStageColor(customer.stage)}>
                            {getStageLabel(customer.stage)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 relative w-48 max-w-[12rem]">
                          <div className="flex items-center gap-1 w-full">
                            {customer.customer_tags && customer.customer_tags.length > 0 ? (
                              <div className="flex items-center gap-1 w-full relative">
                                <div className="flex items-center gap-1 overflow-hidden flex-1 min-w-0">
                                  {customer.customer_tags.map((ct, index) => (
                                    <span key={ct.tags.id} className="flex items-center flex-shrink-0">
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                        {ct.tags.name}
                                      </span>
                                      {index < customer.customer_tags!.length - 1 && (
                                        <span className="text-gray-400 text-[10px] mx-0.5">,</span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                                {customer.customer_tags.length > 0 && (
                                  <div className="relative flex-shrink-0 ml-auto" data-customer-id={customer.id}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedTagsRow(expandedTagsRow === customer.id ? null : customer.id);
                                      }}
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                      title="Ver todas las etiquetas"
                                    >
                                      <HiDotsHorizontal className="w-3 h-3" />
                                    </button>
                                    {expandedTagsRow === customer.id && (
                                      <div
                                        ref={dropdownRef}
                                        className="fixed z-[9999] w-64 rounded-xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 animate-in fade-in slide-in-from-top-2 duration-200"
                                        style={{
                                          top: `${(document.querySelector(`[data-customer-id="${customer.id}"]`) as HTMLElement)?.getBoundingClientRect().bottom + 4}px`,
                                          left: `${(document.querySelector(`[data-customer-id="${customer.id}"]`) as HTMLElement)?.getBoundingClientRect().right - 256}px`
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                            Todas las etiquetas ({customer.customer_tags.length})
                                          </span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setExpandedTagsRow(null);
                                            }}
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          </button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                                          {customer.customer_tags.map((ct) => (
                                            <span
                                              key={ct.tags.id}
                                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group"
                                            >
                                              <span>{ct.tags.name}</span>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setTagToDelete({ customerId: customer.id, tagId: ct.tags.id, tagName: ct.tags.name });
                                                }}
                                                className="opacity-0 group-hover:opacity-100 hover:text-red-600 dark:hover:text-red-400 transition-all"
                                                title="Eliminar etiqueta"
                                              >
                                                <HiX className="w-3 h-3" />
                                              </button>
                                            </span>
                                          ))}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingTagsCustomer(customer);
                                              setShowTagsModal(true);
                                              setExpandedTagsRow(null);
                                            }}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                                            title="Agregar etiquetas"
                                          >
                                            <HiPlus className="w-3 h-3" />
                                            Agregar
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400">Sin etiquetas</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setShowChatsModal(true);
                              }}
                              className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
                              title="Ver chats"
                            >
                              <HiChat className="w-4 h-4 text-text-secondary" />
                            </button>
                            <button
                              onClick={() => handleEdit(customer)}
                              className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
                              title="Editar"
                            >
                              <HiPencil className="w-4 h-4 text-text-secondary" />
                            </button>
                            <button
                              onClick={() => {
                                setCustomerToDelete(customer.id);
                                setDeleteModal(true);
                              }}
                              className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <HiTrash className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-border/10 flex items-center justify-between">
              <p className="text-sm text-text-secondary">
                Mostrando <span className="font-medium text-foreground">{filteredCustomers.length}</span> de{' '}
                <span className="font-medium text-foreground">{customers.length}</span> clientes
              </p>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-sm font-medium text-foreground transition-colors">
                  Anterior
                </button>
                <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium transition-colors">
                  1
                </button>
                <button className="px-4 py-2 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-sm font-medium text-foreground transition-colors">
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="bg-background rounded-xl border border-current/20 p-12">
            <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <HiUserGroup className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                No se encontraron clientes
              </h2>
              <p className="text-text-secondary mb-6">
                {searchTerm || stageFilter !== 'all'
                  ? 'Intenta ajustar tus filtros de búsqueda'
                  : 'Comienza creando tu primer cliente para gestionar tu CRM'}
              </p>
              <button 
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <HiPlus className="w-5 h-5" />
                <span>Crear Primer Cliente</span>
              </button>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {deleteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background rounded-2xl max-w-md w-full shadow-2xl border border-current/20">
              <div className="p-6 border-b border-current/20">
                <h3 className="text-xl font-semibold text-foreground">Eliminar Cliente</h3>
              </div>
              <div className="p-6">
                <p className="text-text-secondary">
                  ¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-current/20">
                <button
                  onClick={() => setDeleteModal(false)}
                  className="px-4 py-2 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-foreground font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Eliminar
                </button>
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
                    onClick={handleDeleteTag}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-red-600/25"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tags Management Modal */}
        {showTagsModal && editingTagsCustomer && (
          <CustomerForm
            customer={editingTagsCustomer}
            onClose={() => {
              setShowTagsModal(false);
              setEditingTagsCustomer(null);
            }}
            onSubmit={async () => {
              await fetchCustomers();
              setShowTagsModal(false);
              setEditingTagsCustomer(null);
            }}
          />
        )}

        {/* Chats Modal */}
        {showChatsModal && selectedCustomer && (
          <CustomerChatsModal
            customerId={selectedCustomer.id}
            customerName={selectedCustomer.name}
            onClose={() => {
              setShowChatsModal(false);
              setSelectedCustomer(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
