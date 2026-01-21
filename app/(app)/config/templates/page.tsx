"use client";

import { useState, useEffect } from "react";
import { HiTemplate, HiPlus, HiPencil, HiTrash, HiSearch, HiFilter, HiLightningBolt } from "react-icons/hi";
import { Badge, Spinner } from "flowbite-react";
import type { Template } from "@/app/types/templates";
import TemplateForm from "./components/TemplateForm";

const CATEGORIES = [
  { value: "", label: "Todas" },
  { value: "saludo", label: "Saludos" },
  { value: "despedida", label: "Despedidas" },
  { value: "informacion", label: "Información" },
  { value: "promocion", label: "Promociones" },
  { value: "soporte", label: "Soporte" },
  { value: "seguimiento", label: "Seguimiento" },
  { value: "otro", label: "Otro" },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) {
        params.append("category", selectedCategory);
      }
      const response = await fetch(`/api/templates?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory]);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta plantilla?")) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTemplates(templates.filter((t) => t.id !== id));
      } else {
        alert("Error al eliminar la plantilla");
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      alert("Error al eliminar la plantilla");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingTemplate(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    loadTemplates();
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.shortcut && template.shortcut.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const getCategoryLabel = (category: string | undefined) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat?.label || "Sin categoría";
  };

  const getCategoryColor = (category: string | undefined): "info" | "success" | "warning" | "failure" | "gray" | "purple" | "pink" => {
    const colors: Record<string, "info" | "success" | "warning" | "failure" | "gray" | "purple" | "pink"> = {
      saludo: "success",
      despedida: "info",
      informacion: "purple",
      promocion: "warning",
      soporte: "failure",
      seguimiento: "pink",
      otro: "gray",
    };
    return colors[category || ""] || "gray";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Plantillas de Respuesta</h1>
          <p className="text-text-secondary mt-1">
            Crea y gestiona plantillas para responder rápidamente
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/25"
        >
          <HiPlus className="w-5 h-5" />
          Nueva Plantilla
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Buscar plantillas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-input-bg border border-input-border rounded-lg text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <HiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="pl-10 pr-8 py-3 bg-input-bg border border-input-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none min-w-[180px]"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <HiTemplate className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            {templates.length === 0 ? "No hay plantillas" : "No se encontraron resultados"}
          </h3>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            {templates.length === 0
              ? "Crea tu primera plantilla para responder rápidamente a preguntas frecuentes"
              : "Intenta con otros términos de búsqueda o filtros"}
          </p>
          {templates.length === 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/25"
            >
              <HiPlus className="w-5 h-5" />
              Crear Plantilla
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`bg-background-bg border border-current/20 rounded-xl p-5 hover:shadow-lg transition-all duration-200 ${
                !template.is_active ? "opacity-60" : ""
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{template.name}</h3>
                  {template.shortcut && (
                    <div className="flex items-center gap-1 mt-1">
                      <HiLightningBolt className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-primary font-mono">/{template.shortcut}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
                    title="Editar"
                  >
                    <HiPencil className="w-4 h-4 text-text-secondary hover:text-primary" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    disabled={deletingId === template.id}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    {deletingId === template.id ? (
                      <Spinner size="sm" />
                    ) : (
                      <HiTrash className="w-4 h-4 text-text-secondary hover:text-red-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Content Preview */}
              <p className="text-sm text-text-secondary line-clamp-3 mb-4">{template.content}</p>

              {/* Footer */}
              <div className="flex items-center justify-between gap-2">
                <Badge color={getCategoryColor(template.category)} size="sm">
                  {getCategoryLabel(template.category)}
                </Badge>
                {!template.is_active && (
                  <Badge color="gray" size="sm">
                    Inactiva
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {templates.length > 0 && (
        <div className="flex items-center justify-center gap-6 text-sm text-text-secondary pt-4 border-t border-current/20">
          <span>
            <strong className="text-foreground">{templates.length}</strong> plantillas en total
          </span>
          <span>
            <strong className="text-foreground">{templates.filter((t) => t.is_active).length}</strong> activas
          </span>
          <span>
            <strong className="text-foreground">{templates.filter((t) => t.shortcut).length}</strong> con atajo
          </span>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <TemplateForm
          template={editingTemplate}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}