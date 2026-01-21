'use client';

import { useState, useEffect } from 'react';
import { HiX, HiPlus, HiPencil, HiTrash, HiExclamationCircle } from 'react-icons/hi';
import { Badge, Spinner } from 'flowbite-react';
import { useWorkspace } from '@/app/providers/WorkspaceProvider';
import TagsSelector from '@/app/(app)/components/TagsSelector';

interface CustomerAttribute {
  id: string;
  attribute_name: string;
  attribute_value: string;
}

interface Customer {
  id: string;
  name: string;
  identity_document_type: string;
  identity_document_number: string;
  email: string;
  city: string;
  province: string;
  district: string;
  address: string;
  stage: string;
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

interface CustomerDetailModalProps {
  customerId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function CustomerDetailModal({
  customerId,
  onClose,
  onUpdate
}: CustomerDetailModalProps) {
  const { currentWorkspace } = useWorkspace();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    identity_document_type: 'DNI',
    identity_document_number: '',
    email: '',
    city: '',
    province: '',
    district: '',
    address: '',
    stage: 'prospect'
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<CustomerAttribute[]>([]);
  const [newAttributeName, setNewAttributeName] = useState('');
  const [newAttributeValue, setNewAttributeValue] = useState('');
  const [editingAttributeId, setEditingAttributeId] = useState<string | null>(null);

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  const loadCustomer = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customers/${customerId}`);
      if (response.ok) {
        const data = await response.json();
        setCustomer(data);
        setFormData({
          name: data.name,
          identity_document_type: data.identity_document_type,
          identity_document_number: data.identity_document_number,
          email: data.email,
          city: data.city,
          province: data.province,
          district: data.district,
          address: data.address,
          stage: data.stage
        });
        if (data.customer_tags) {
          setSelectedTags(data.customer_tags.map((ct: any) => ct.tag_id));
        }
        await loadCustomerAttributes(customerId);
      }
    } catch (error) {
      console.error('Error loading customer:', error);
      setError('Error al cargar el cliente');
    } finally {
      setLoading(false);
    }
  };



  const loadCustomerAttributes = async (custId: string) => {
    try {
      const response = await fetch(`/api/customer-attributes?customer_id=${custId}`);
      if (response.ok) {
        const data = await response.json();
        setAttributes(data);
      }
    } catch (error) {
      console.error('Error loading attributes:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagsChange = (tagIds: string[]) => {
    setSelectedTags(tagIds);
  };

  const handleAddAttribute = () => {
    if (!newAttributeName.trim() || !newAttributeValue.trim()) {
      setError('El nombre y valor del atributo son requeridos');
      return;
    }

    const newAttr: CustomerAttribute = {
      id: `temp-${Date.now()}`,
      attribute_name: newAttributeName.trim(),
      attribute_value: newAttributeValue.trim()
    };

    setAttributes(prev => [...prev, newAttr]);
    setNewAttributeName('');
    setNewAttributeValue('');
    setError('');
  };

  const handleUpdateAttribute = (id: string, name: string, value: string) => {
    setAttributes(prev => prev.map(attr =>
      attr.id === id ? { ...attr, attribute_name: name, attribute_value: value } : attr
    ));
    setEditingAttributeId(null);
  };

  const handleDeleteAttribute = (id: string) => {
    setAttributes(prev => prev.filter(attr => attr.id !== id));
  };

  const saveAttributes = async (custId: string) => {
    try {
      // Delete old attributes
      const existingResponse = await fetch(`/api/customer-attributes?customer_id=${custId}`);
      if (existingResponse.ok) {
        const existingAttrs = await existingResponse.json();
        for (const attr of existingAttrs) {
          if (!attributes.find(a => a.id === attr.id)) {
            await fetch(`/api/customer-attributes?id=${attr.id}`, { method: 'DELETE' });
          }
        }
      }

      // Save new/updated attributes
      for (const attr of attributes) {
        if (attr.id.startsWith('temp-')) {
          await fetch('/api/customer-attributes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customer_id: custId,
              attribute_name: attr.attribute_name,
              attribute_value: attr.attribute_value
            })
          });
        } else {
          await fetch('/api/customer-attributes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: attr.id,
              attribute_name: attr.attribute_name,
              attribute_value: attr.attribute_value
            })
          });
        }
      }
    } catch (error) {
      console.error('Error saving attributes:', error);
    }
  };

  const handleSave = async () => {
    setError('');
    try {
      setSaving(true);
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: selectedTags
        })
      });

      if (response.ok) {
        await saveAttributes(customerId);
        await loadCustomer();
        setIsEditing(false);
        onUpdate();
      } else {
        const data = await response.json();
        setError(data.error || 'Error al guardar el cliente');
      }
    } catch (err) {
      setError('Error al guardar el cliente');
      console.error(err);
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50">
        <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full p-8 border border-current/20">
          <div className="flex justify-center items-center">
            <Spinner size="xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-current/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-current/20 bg-background sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground">
                {isEditing ? 'Editar Cliente' : 'Detalles del Cliente'}
              </h3>
              <p className="text-sm text-text-secondary">{customer.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2"
              >
                <HiPencil className="w-4 h-4" />
                Editar
              </button>
            )}
            <button
              onClick={onClose}
              className="text-text-tertiary hover:text-foreground transition-colors p-2"
            >
              <HiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <HiExclamationCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
            </div>
          )}

          {/* View Mode */}
          {!isEditing ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1">Nombre</label>
                  <p className="text-foreground">{customer.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1">Email</label>
                  <p className="text-foreground">{customer.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1">Documento</label>
                  <p className="text-foreground">{customer.identity_document_type}: {customer.identity_document_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1">Etapa</label>
                  <Badge color={getStageColor(customer.stage)}>{getStageLabel(customer.stage)}</Badge>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1">Ciudad</label>
                  <p className="text-foreground">{customer.city || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1">Provincia</label>
                  <p className="text-foreground">{customer.province || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1">Distrito</label>
                  <p className="text-foreground">{customer.district || '-'}</p>
                </div>
              </div>

              {customer.address && (
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1">Dirección</label>
                  <p className="text-foreground">{customer.address}</p>
                </div>
              )}

              {/* Tags */}
              <div className="border-t border-current/20 pt-6">
                <label className="block text-sm font-semibold text-foreground mb-3">Etiquetas</label>
                {customer.customer_tags && customer.customer_tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {customer.customer_tags.map((ct) => (
                      <span
                        key={ct.tags.id}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-hover-bg text-foreground"
                        style={{
                          borderColor: ct.tags.color,
                          borderWidth: '1px',
                          borderStyle: 'solid'
                        }}
                      >
                        {ct.tags.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary">No hay etiquetas</p>
                )}
              </div>

              {/* Attributes */}
              <div className="border-t border-current/20 pt-6">
                <label className="block text-sm font-semibold text-foreground mb-3">Atributos Personalizados</label>
                {attributes.length > 0 ? (
                  <div className="space-y-2">
                    {attributes.map((attr) => (
                      <div key={attr.id} className="p-3 rounded-lg border border-current/20 bg-hover-bg">
                        <p className="text-xs font-semibold text-foreground">{attr.attribute_name}</p>
                        <p className="text-sm text-text-secondary mt-1">{attr.attribute_value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary">No hay atributos personalizados</p>
                )}
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <div className="space-y-6">
              {/* Main Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Nombre *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Tipo de Documento *</label>
                  <select
                    name="identity_document_type"
                    value={formData.identity_document_type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="DNI">DNI</option>
                    <option value="CE">CE</option>
                    <option value="RUC">RUC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Número de Documento *</label>
                  <input
                    type="text"
                    name="identity_document_number"
                    value={formData.identity_document_number}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Ciudad</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Provincia</label>
                  <input
                    type="text"
                    name="province"
                    value={formData.province}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Distrito</label>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Etapa</label>
                  <select
                    name="stage"
                    value={formData.stage}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="prospect">Prospecto</option>
                    <option value="qualified">Calificado</option>
                    <option value="negotiation">Negociación</option>
                    <option value="customer">Cliente</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Dirección</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Tags Section */}
              <div className="border-t border-current/20 pt-6">
                {!currentWorkspace ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2 text-sm text-text-secondary">Cargando workspace...</span>
                  </div>
                ) : (
                  <TagsSelector
                    selectedTags={selectedTags}
                    onTagsChange={handleTagsChange}
                    workspaceId={currentWorkspace.id}
                    allowCreate={true}
                  />
                )}
              </div>

              {/* Custom Attributes Section */}
              <div className="border-t border-current/20 pt-6">
                <label className="block text-sm font-semibold text-foreground mb-4">Atributos Personalizados</label>
                
                <div className="mb-4 p-4 rounded-lg border border-current/20 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Nombre del atributo"
                      value={newAttributeName}
                      onChange={(e) => setNewAttributeName(e.target.value)}
                      className="px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Valor"
                      value={newAttributeValue}
                      onChange={(e) => setNewAttributeValue(e.target.value)}
                      className="px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAttribute}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                  >
                    <HiPlus className="w-4 h-4" />
                    Agregar Atributo
                  </button>
                </div>

                {attributes.length > 0 && (
                  <div className="space-y-2">
                    {attributes.map((attr) => (
                      <div key={attr.id} className="flex items-center gap-2 p-3 rounded-lg border border-current/20 bg-hover-bg">
                        {editingAttributeId === attr.id ? (
                          <>
                            <input
                              type="text"
                              value={attr.attribute_name}
                              onChange={(e) => handleUpdateAttribute(attr.id, e.target.value, attr.attribute_value)}
                              className="flex-1 px-2 py-1 border border-current/20 rounded bg-input-bg text-foreground text-sm"
                            />
                            <input
                              type="text"
                              value={attr.attribute_value}
                              onChange={(e) => handleUpdateAttribute(attr.id, attr.attribute_name, e.target.value)}
                              className="flex-1 px-2 py-1 border border-current/20 rounded bg-input-bg text-foreground text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => setEditingAttributeId(null)}
                              className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90"
                            >
                              Guardar
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1">
                              <span className="text-xs font-semibold text-foreground">{attr.attribute_name}:</span>
                              <span className="text-xs text-text-secondary ml-2">{attr.attribute_value}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditingAttributeId(attr.id)}
                              className="p-1 hover:bg-primary/10 rounded transition-colors"
                            >
                              <HiPencil className="w-4 h-4 text-primary" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAttribute(attr.id)}
                              className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            >
                              <HiTrash className="w-4 h-4 text-red-600" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {isEditing && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-current/20 bg-background sticky bottom-0">
            <button
              onClick={() => {
                setIsEditing(false);
                loadCustomer();
              }}
              className="px-6 py-2 bg-text-secondary dark:bg-border text-foreground rounded-lg hover:bg-text-tertiary dark:hover:bg-border/80 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}