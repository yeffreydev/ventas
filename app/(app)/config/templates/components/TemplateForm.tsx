"use client";

import { useState, useEffect } from "react";
import { HiX } from "react-icons/hi";
import type { Template, CreateTemplateInput, UpdateTemplateInput } from "@/app/types/templates";

interface TemplateFormProps {
  template?: Template | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { value: "", label: "Sin categoría" },
  { value: "saludo", label: "Saludos" },
  { value: "despedida", label: "Despedidas" },
  { value: "informacion", label: "Información" },
  { value: "promocion", label: "Promociones" },
  { value: "soporte", label: "Soporte" },
  { value: "seguimiento", label: "Seguimiento" },
  { value: "otro", label: "Otro" },
];

export default function TemplateForm({ template, onClose, onSuccess }: TemplateFormProps) {
  const [formData, setFormData] = useState<CreateTemplateInput>({
    name: "",
    content: "",
    shortcut: "",
    category: "",
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!template;

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        content: template.content,
        shortcut: template.shortcut || "",
        category: template.category || "",
        is_active: template.is_active,
      });
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = isEditing ? `/api/templates/${template.id}` : "/api/templates";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          shortcut: formData.shortcut || null,
          category: formData.category || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al guardar la plantilla");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-current/20">
        {/* Header */}
        <div className="p-6 border-b border-current/20">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground">
              {isEditing ? "Editar Plantilla" : "Nueva Plantilla"}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
            >
              <HiX className="w-6 h-6 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Saludo inicial"
              className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-lg text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Contenido <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Escribe el contenido de la plantilla..."
              rows={6}
              className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-lg text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              required
            />
            <p className="mt-2 text-xs text-text-tertiary">
              Puedes usar variables como {"{nombre}"}, {"{empresa}"}, etc.
            </p>
          </div>

          {/* Shortcut */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Atajo (opcional)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-text-secondary">/</span>
              <input
                type="text"
                value={formData.shortcut}
                onChange={(e) => setFormData({ ...formData, shortcut: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") })}
                placeholder="saludo"
                className="flex-1 px-4 py-3 bg-input-bg border border-input-border rounded-lg text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50"
                maxLength={20}
              />
            </div>
            <p className="mt-2 text-xs text-text-tertiary">
              Escribe /{formData.shortcut || "atajo"} en el chat para insertar esta plantilla
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Categoría (opcional)
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 rounded border-input-border text-primary focus:ring-primary/50"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-foreground">
              Plantilla activa
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-current/20 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-current/20 rounded-lg hover:bg-hover-bg transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.name || !formData.content}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Plantilla"}
          </button>
        </div>
      </div>
    </div>
  );
}