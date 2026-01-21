'use client';

import { useState, useEffect } from 'react';
import { HiPlus, HiExclamationCircle, HiX, HiTrash, HiPencil } from 'react-icons/hi';
import { useWorkspace } from '@/app/providers/WorkspaceProvider';
import TagsSelector from '@/app/(app)/components/TagsSelector';

// Atributo de cliente con tipo de dato
interface CustomerAttribute {
  id: string;
  attribute_name: string;
  attribute_value: string;
  attribute_type: 'text' | 'number' | 'select' | 'date' | 'checkbox';
  attribute_options?: string[]; // Para tipo select
}

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

interface CustomerFormProps {
  customer?: Customer | null;
  onClose: () => void;
  onSubmit: () => void;
}

export default function CustomerForm({
  customer,
  onClose,
  onSubmit
}: CustomerFormProps) {
  const { currentWorkspace } = useWorkspace();
  const [formData, setFormData] = useState({
    name: '',
    identity_document_type: 'DNI',
    identity_document_number: '',
    email: '',
    phone: '',
    city: '',
    province: '',
    district: '',
    address: '',
    stage: 'prospect'
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Custom Attributes State - ahora con tipo de dato por atributo
  const [attributes, setAttributes] = useState<CustomerAttribute[]>([]);
  const [newAttributeName, setNewAttributeName] = useState('');
  const [newAttributeValue, setNewAttributeValue] = useState('');
  const [newAttributeType, setNewAttributeType] = useState<'text' | 'number' | 'select' | 'date' | 'checkbox'>('text');
  const [newAttributeOptions, setNewAttributeOptions] = useState(''); // Para tipo select
  const [editingAttributeId, setEditingAttributeId] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        identity_document_type: customer.identity_document_type || 'DNI',
        identity_document_number: customer.identity_document_number || '',
        email: customer.email || '',
        phone: customer.phone || '',
        city: customer.city || '',
        province: customer.province || '',
        district: customer.district || '',
        address: customer.address || '',
        stage: customer.stage || 'prospect'
      });

      if (customer.customer_tags) {
        setSelectedTags(customer.customer_tags.map(ct => ct.tag_id));
      }
      
      // Load customer attributes
      if (currentWorkspace) {
        loadCustomerAttributes(customer.id);
      }
    }
  }, [customer, currentWorkspace]);

  const loadCustomerAttributes = async (customerId: string) => {
    if (!currentWorkspace) {
      console.log('[loadCustomerAttributes] No workspace');
      return;
    }
    console.log('[loadCustomerAttributes] Loading for customer:', customerId);
    
    try {
      const response = await fetch(`/api/customer-attributes?customer_id=${customerId}&workspace_id=${currentWorkspace.id}`);
      console.log('[loadCustomerAttributes] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[loadCustomerAttributes] Raw data:', data);
        
        // Parse attributes with type info
        const parsed = data.map((attr: any) => {
          let parsedOptions: string[] | undefined;
          let attrType: CustomerAttribute['attribute_type'] = 'text';
          let attrValue = attr.attribute_value || '';
          
          // Try to parse stored JSON value that might have type info
          try {
            const stored = JSON.parse(attr.attribute_value);
            if (stored && typeof stored === 'object' && stored._type) {
              attrType = stored._type;
              attrValue = stored._value || '';
              parsedOptions = stored._options;
            }
          } catch {
            // Not JSON, just plain text value
            attrValue = attr.attribute_value || '';
          }
          
          return {
            id: attr.id,
            attribute_name: attr.attribute_name,
            attribute_value: attrValue,
            attribute_type: attrType,
            attribute_options: parsedOptions
          };
        });
        console.log('[loadCustomerAttributes] Parsed attributes:', parsed);
        setAttributes(parsed);
      } else {
        console.error('[loadCustomerAttributes] Failed:', await response.text());
      }
    } catch (error) {
      console.error('[loadCustomerAttributes] Error:', error);
    }
  };

  const handleAddAttribute = () => {
    if (!newAttributeName.trim()) {
      setError('El nombre del atributo es requerido');
      return;
    }
    
    // Validar valor según tipo
    if (newAttributeType !== 'checkbox' && !newAttributeValue.trim()) {
      setError('El valor del atributo es requerido');
      return;
    }

    if (newAttributeType === 'select' && !newAttributeOptions.trim()) {
      setError('Las opciones son requeridas para tipo Selección');
      return;
    }

    const options = newAttributeType === 'select' 
      ? newAttributeOptions.split(',').map(o => o.trim()).filter(Boolean)
      : undefined;

    const newAttr: CustomerAttribute = {
      id: `temp-${Date.now()}`,
      attribute_name: newAttributeName.trim(),
      attribute_value: newAttributeType === 'checkbox' ? (newAttributeValue === 'true' ? 'true' : 'false') : newAttributeValue.trim(),
      attribute_type: newAttributeType,
      attribute_options: options
    };

    setAttributes(prev => [...prev, newAttr]);
    setNewAttributeName('');
    setNewAttributeValue('');
    setNewAttributeType('text');
    setNewAttributeOptions('');
    setError('');
  };

  const handleUpdateAttributeValue = (id: string, value: string) => {
    setAttributes(prev => prev.map(attr =>
      attr.id === id ? { ...attr, attribute_value: value } : attr
    ));
  };

  const handleDeleteAttribute = (id: string) => {
    setAttributes(prev => prev.filter(attr => attr.id !== id));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      
      if (!currentWorkspace) {
        setError('No workspace selected');
        return;
      }

      const url = customer ? `/api/customers/${customer.id}` : '/api/customers';
      const method = customer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          tags: selectedTags,
          workspace_id: currentWorkspace.id
        })
      });

      if (response.ok) {
        const savedCustomer = await response.json();
        const customerId = customer?.id || savedCustomer.id;
        
        // Save attributes
        await saveAttributes(customerId);
        
        onSubmit();
      } else {
        const data = await response.json();
        setError(data.error || 'Error al guardar el cliente');
      }
    } catch (err) {
      setError('Error al guardar el cliente');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveAttributes = async (customerId: string) => {
    if (!currentWorkspace) {
      console.error('[saveAttributes] No workspace');
      return;
    }
    
    console.log('[saveAttributes] Saving', attributes.length, 'attributes for customer', customerId);
    
    try {
      // Get existing attributes to determine which to delete
      const existingResponse = await fetch(`/api/customer-attributes?customer_id=${customerId}&workspace_id=${currentWorkspace.id}`);
      const existingAttrs = existingResponse.ok ? await existingResponse.json() : [];
      console.log('[saveAttributes] Existing attributes:', existingAttrs.length);
      
      // Delete attributes that are no longer present
      for (const existing of existingAttrs) {
        if (!attributes.find(a => a.id === existing.id)) {
          console.log('[saveAttributes] Deleting attribute', existing.id);
          const delRes = await fetch(`/api/customer-attributes?id=${existing.id}`, { method: 'DELETE' });
          if (!delRes.ok) {
            console.error('[saveAttributes] Delete failed:', await delRes.text());
          }
        }
      }

      // Save each attribute with type info encoded in value
      for (const attr of attributes) {
        // Encode type and options in the value as JSON
        const storedValue = JSON.stringify({
          _type: attr.attribute_type,
          _value: attr.attribute_value,
          _options: attr.attribute_options
        });

        if (attr.id.startsWith('temp-')) {
          // Create new attribute
          console.log('[saveAttributes] Creating new attribute:', attr.attribute_name);
          const createRes = await fetch('/api/customer-attributes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customer_id: customerId,
              attribute_name: attr.attribute_name,
              attribute_value: storedValue,
              workspace_id: currentWorkspace.id
            })
          });
          if (!createRes.ok) {
            const errorText = await createRes.text();
            console.error('[saveAttributes] Create failed:', errorText);
          } else {
            console.log('[saveAttributes] Created successfully');
          }
        } else {
          // Update existing attribute
          console.log('[saveAttributes] Updating attribute:', attr.id, attr.attribute_name);
          const updateRes = await fetch('/api/customer-attributes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: attr.id,
              attribute_name: attr.attribute_name,
              attribute_value: storedValue
            })
          });
          if (!updateRes.ok) {
            const errorText = await updateRes.text();
            console.error('[saveAttributes] Update failed:', errorText);
          } else {
            console.log('[saveAttributes] Updated successfully');
          }
        }
      }
      console.log('[saveAttributes] Done saving attributes');
    } catch (error) {
      console.error('[saveAttributes] Error:', error);
    }
  };

  // Renderizar input según tipo de dato
  const renderAttributeInput = (attr: CustomerAttribute) => {
    const inputClass = "w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm";
    
    switch (attr.attribute_type) {
      case 'number':
        return (
          <input
            type="number"
            value={attr.attribute_value}
            onChange={(e) => handleUpdateAttributeValue(attr.id, e.target.value)}
            className={inputClass}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={attr.attribute_value}
            onChange={(e) => handleUpdateAttributeValue(attr.id, e.target.value)}
            className={inputClass}
          />
        );
      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={attr.attribute_value === 'true'}
              onChange={(e) => handleUpdateAttributeValue(attr.id, e.target.checked ? 'true' : 'false')}
              className="w-4 h-4 text-primary bg-input-bg border-input-border rounded focus:ring-primary"
            />
            <span className="text-sm text-foreground">{attr.attribute_value === 'true' ? 'Sí' : 'No'}</span>
          </div>
        );
      case 'select':
        return (
          <select
            value={attr.attribute_value}
            onChange={(e) => handleUpdateAttributeValue(attr.id, e.target.value)}
            className={inputClass}
          >
            <option value="">Seleccionar...</option>
            {attr.attribute_options?.map((opt, idx) => (
              <option key={idx} value={opt}>{opt}</option>
            ))}
          </select>
        );
      default: // text
        return (
          <input
            type="text"
            value={attr.attribute_value}
            onChange={(e) => handleUpdateAttributeValue(attr.id, e.target.value)}
            className={inputClass}
          />
        );
    }
  };

  // Etiqueta de tipo
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      text: 'Texto',
      number: 'Número',
      select: 'Selección',
      date: 'Fecha',
      checkbox: 'Casilla'
    };
    return labels[type] || type;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50">
      <div className="card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-current/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-current/20 bg-background">
          <h3 className="text-2xl font-bold text-foreground">
            {customer ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-text-tertiary hover:text-foreground transition-colors"
          >
            <HiX className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6 ">
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <HiExclamationCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
              </div>
            )}

            {/* Main Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Nombre del cliente"
                  className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="cliente@ejemplo.com"
                  className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+51 987 654 321"
                  className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                />
              </div>

              {/* Document Type */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Tipo de Documento *
                </label>
                <select
                  name="identity_document_type"
                  value={formData.identity_document_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                >
                  <option value="DNI">DNI</option>
                  <option value="CE">CE</option>
                  <option value="RUC">RUC</option>
                </select>
              </div>

              {/* Document Number */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Número de Documento *
                </label>
                <input
                  type="text"
                  name="identity_document_number"
                  value={formData.identity_document_number}
                  onChange={handleInputChange}
                  required
                  placeholder="12345678"
                  className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Ciudad
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Lima"
                  className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                />
              </div>

              {/* Province */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Provincia
                </label>
                <input
                  type="text"
                  name="province"
                  value={formData.province}
                  onChange={handleInputChange}
                  placeholder="Lima"
                  className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                />
              </div>

              {/* District */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Distrito
                </label>
                <input
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleInputChange}
                  placeholder="Miraflores"
                  className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                />
              </div>

              {/* Stage */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Etapa
                </label>
                <select
                  name="stage"
                  value={formData.stage}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                >
                  <option value="prospect">Prospecto</option>
                  <option value="qualified">Calificado</option>
                  <option value="negotiation">Negociación</option>
                  <option value="customer">Cliente</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Dirección
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Dirección completa"
                rows={3}
                className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
              />
            </div>

            {/* Tags Section */}
            <div className="border-t border-current/20 pt-6">
              {currentWorkspace && (
                <TagsSelector
                  selectedTags={selectedTags}
                  onTagsChange={handleTagsChange}
                  workspaceId={currentWorkspace.id}
                  allowCreate={true}
                />
              )}
            </div>

            {/* Custom Attributes Section - UI MÁS INTUITIVA */}
            <div className="border-t border-current/20 pt-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-foreground">Atributos Personalizados</label>
                {attributes.length > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                    {attributes.length} {attributes.length === 1 ? 'atributo' : 'atributos'}
                  </span>
                )}
              </div>
              
              {/* Mensaje informativo */}
              <p className="text-xs text-text-tertiary mb-4">
                Los atributos se guardarán junto con el cliente al presionar "{customer ? 'Actualizar Cliente' : 'Crear Cliente'}"
              </p>

              {/* Lista de atributos agregados - PRIMERO para que sea visible */}
              {attributes.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Atributos a guardar:
                  </p>
                  {attributes.map((attr) => (
                    <div
                      key={attr.id}
                      className={`p-3 rounded-lg border bg-background flex items-center justify-between gap-2 ${
                        attr.id.startsWith('temp-') 
                          ? 'border-primary/30 bg-primary/5' 
                          : 'border-current/20'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-foreground">{attr.attribute_name}</span>
                          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                            {getTypeLabel(attr.attribute_type)}
                          </span>
                          {attr.id.startsWith('temp-') && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full">
                              Nuevo
                            </span>
                          )}
                        </div>
                        <div className="mt-1">
                          {renderAttributeInput(attr)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttribute(attr.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                        title="Eliminar atributo"
                      >
                        <HiTrash className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulario para agregar nuevo atributo */}
              <div className="p-4 rounded-lg border border-dashed border-current/30 bg-hover-bg/30 space-y-4">
                <p className="text-xs font-medium text-foreground">Agregar nuevo atributo:</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Nombre */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Nombre del Atributo *
                    </label>
                    <input
                      type="text"
                      placeholder="ej: Teléfono Secundario"
                      value={newAttributeName}
                      onChange={(e) => setNewAttributeName(e.target.value)}
                      className="w-full px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm"
                    />
                  </div>
                  
                  {/* Tipo de Dato */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Tipo de Dato *
                    </label>
                    <select
                      value={newAttributeType}
                      onChange={(e) => {
                        setNewAttributeType(e.target.value as any);
                        setNewAttributeValue('');
                        setNewAttributeOptions('');
                      }}
                      className="w-full px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm"
                    >
                      <option value="text">Texto</option>
                      <option value="number">Número</option>
                      <option value="date">Fecha</option>
                      <option value="select">Selección</option>
                      <option value="checkbox">Casilla (Sí/No)</option>
                    </select>
                  </div>
                </div>

                {/* Opciones para tipo select */}
                {newAttributeType === 'select' && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Opciones (separadas por comas) *
                    </label>
                    <input
                      type="text"
                      placeholder="ej: Opción 1, Opción 2, Opción 3"
                      value={newAttributeOptions}
                      onChange={(e) => setNewAttributeOptions(e.target.value)}
                      className="w-full px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm"
                    />
                  </div>
                )}

                {/* Valor según tipo */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Valor {newAttributeType !== 'checkbox' && '*'}
                  </label>
                  
                  {newAttributeType === 'text' && (
                    <input
                      type="text"
                      placeholder="Ingrese el valor"
                      value={newAttributeValue}
                      onChange={(e) => setNewAttributeValue(e.target.value)}
                      className="w-full px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm"
                    />
                  )}
                  
                  {newAttributeType === 'number' && (
                    <input
                      type="number"
                      placeholder="Ingrese el número"
                      value={newAttributeValue}
                      onChange={(e) => setNewAttributeValue(e.target.value)}
                      className="w-full px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm"
                    />
                  )}
                  
                  {newAttributeType === 'date' && (
                    <input
                      type="date"
                      value={newAttributeValue}
                      onChange={(e) => setNewAttributeValue(e.target.value)}
                      className="w-full px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm"
                    />
                  )}
                  
                  {newAttributeType === 'select' && (
                    <select
                      value={newAttributeValue}
                      onChange={(e) => setNewAttributeValue(e.target.value)}
                      className="w-full px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm"
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
                        id="new-attr-checkbox"
                        checked={newAttributeValue === 'true'}
                        onChange={(e) => setNewAttributeValue(e.target.checked ? 'true' : 'false')}
                        className="w-4 h-4 text-primary bg-input-bg border-input-border rounded focus:ring-primary"
                      />
                      <label htmlFor="new-attr-checkbox" className="text-sm text-foreground">
                        {newAttributeValue === 'true' ? 'Sí' : 'No'}
                      </label>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAddAttribute}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                >
                  <HiPlus className="w-4 h-4" />
                  Añadir a la Lista
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-current/20 bg-background">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 cursor-pointer bg-text-secondary dark:bg-border text-foreground rounded-lg hover:bg-text-tertiary dark:hover:bg-border/80 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 cursor-pointer bg-primary rounded-lg text-white hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50"
          >
            {loading ? 'Guardando...' : customer ? 'Actualizar Cliente' : 'Crear Cliente'}
          </button>
        </div>
      </div>
    </div>
  );
}
