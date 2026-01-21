"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Loader2, Save, X, GripVertical, ArrowLeft } from "lucide-react";
import { useWorkspace } from "@/app/providers/WorkspaceProvider";

interface FieldDefinition {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox';
  required: boolean;
  default_value?: string;
  options?: string[];
  order_position: number;
}

export default function OrderCustomFieldsPage() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'date' | 'checkbox';
    required: boolean;
    default_value: string;
    options: string;
    order_position: number;
  }>({
    name: '',
    label: '',
    type: 'text',
    required: false,
    default_value: '',
    options: '',
    order_position: 0
  });

  useEffect(() => {
    if (currentWorkspace) {
      fetchFields();
    }
  }, [currentWorkspace]);

  const fetchFields = async () => {
    if (!currentWorkspace) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/order-field-definitions?workspace_id=${currentWorkspace.id}`);
      if (response.ok) {
        const data = await response.json();
        setFields(data);
      }
    } catch (error) {
      console.error('Error fetching fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentWorkspace) return;

    try {
      const payload = {
        workspace_id: currentWorkspace.id,
        name: formData.name,
        label: formData.label,
        type: formData.type,
        required: formData.required,
        default_value: formData.default_value || null,
        options: formData.type === 'select' ? formData.options.split(',').map(o => o.trim()).filter(Boolean) : null,
        order_position: formData.order_position || fields.length
      };

      const url = editingField 
        ? `/api/order-field-definitions/${editingField.id}`
        : '/api/order-field-definitions';
      
      const method = editingField ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchFields();
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al guardar el campo');
      }
    } catch (error) {
      console.error('Error saving field:', error);
      alert('Error al guardar el campo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este campo? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await fetch(`/api/order-field-definitions/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchFields();
      }
    } catch (error) {
      console.error('Error deleting field:', error);
    }
  };

  const handleEdit = (field: FieldDefinition) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      label: field.label,
      type: field.type,
      required: field.required,
      default_value: field.default_value || '',
      options: field.options?.join(', ') || '',
      order_position: field.order_position
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      label: '',
      type: 'text',
      required: false,
      default_value: '',
      options: '',
      order_position: 0
    });
    setEditingField(null);
    setShowForm(false);
  };

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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/orders')}
            className="p-2 rounded-lg bg-background hover:bg-hover-bg border border-current/20 transition-colors"
            title="Volver a Pedidos"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Campos Personalizados</h1>
            <p className="text-text-secondary mt-1">Gestiona campos adicionales para pedidos</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Campo
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                {editingField ? 'Editar Campo' : 'Nuevo Campo'}
              </h2>
              <button onClick={resetForm} className="p-2 hover:bg-hover-bg rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nombre del Campo *
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    const name = label.toLowerCase()
                      .replace(/[áàäâ]/g, 'a')
                      .replace(/[éèëê]/g, 'e')
                      .replace(/[íìïî]/g, 'i')
                      .replace(/[óòöô]/g, 'o')
                      .replace(/[úùüû]/g, 'u')
                      .replace(/ñ/g, 'n')
                      .replace(/[^a-z0-9]+/g, '_')
                      .replace(/^_+|_+$/g, '');
                    setFormData({ ...formData, label, name });
                  }}
                  placeholder="ej: Fecha de Entrega"
                  required
                  className="w-full px-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-xs text-text-tertiary mt-1">
                  ID generado automáticamente: <code className="bg-hover-bg px-1 rounded">{formData.name || 'campo_ejemplo'}</code>
                </p>
              </div>


              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Tipo *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="text">Texto</option>
                    <option value="number">Número</option>
                    <option value="select">Selección</option>
                    <option value="date">Fecha</option>
                    <option value="checkbox">Casilla</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Valor por Defecto
                  </label>
                  <input
                    type="text"
                    value={formData.default_value}
                    onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
                    placeholder="Opcional"
                    className="w-full px-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {formData.type === 'select' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Opciones (separadas por comas) *
                  </label>
                  <input
                    type="text"
                    value={formData.options}
                    onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                    placeholder="ej: Opción 1, Opción 2, Opción 3"
                    required={formData.type === 'select'}
                    className="w-full px-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="required"
                  checked={formData.required}
                  onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                  className="w-4 h-4 text-primary bg-input-bg border-input-border rounded focus:ring-primary"
                />
                <label htmlFor="required" className="text-sm font-medium text-foreground">
                  Campo obligatorio
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2.5 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-foreground font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingField ? 'Actualizar' : 'Crear Campo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fields List */}
      <div className="bg-background rounded-xl border border-current/20 overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : fields.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-hover-bg border-b border-current/20">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Campo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Obligatorio
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Opciones
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fields.map((field) => (
                  <tr key={field.id} className="hover:bg-hover-bg transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-foreground">{field.label}</div>
                        <div className="text-xs text-text-tertiary">{field.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-foreground">{getTypeLabel(field.type)}</span>
                    </td>
                    <td className="px-6 py-4">
                      {field.required ? (
                        <span className="text-xs px-2 py-1 bg-red-500/10 text-red-600 rounded-full">Sí</span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-gray-500/10 text-text-tertiary rounded-full">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {field.type === 'select' && field.options && (
                        <div className="text-xs text-text-secondary">
                          {field.options.slice(0, 3).join(', ')}
                          {field.options.length > 3 && ` +${field.options.length - 3}`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(field)}
                          className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4 text-text-secondary" />
                        </button>
                        <button
                          onClick={() => handleDelete(field.id)}
                          className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="text-text-secondary mb-4">
              <Plus className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-lg font-medium">No hay campos personalizados</p>
              <p className="text-sm mt-1">Crea tu primer campo para comenzar</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Crear Campo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
