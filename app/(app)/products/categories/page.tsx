"use client";

import { useState, useEffect } from "react";
import { HiPlus, HiTrash, HiPencil, HiTag, HiXCircle, HiRefresh, HiX } from "react-icons/hi";
import { useWorkspace } from "@/app/providers/WorkspaceProvider";

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  workspace_id: string;
  created_at: string;
  products?: { count: number }[];
}

const defaultColors = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

export default function CategoriesPage() {
  const { currentWorkspace } = useWorkspace();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form/Action state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryColor, setCategoryColor] = useState(defaultColors[0]);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/categories?workspace_id=${currentWorkspace.id}`);
      if (!response.ok) throw new Error("Error al cargar categorías");
      const data = await response.json();
      setCategories(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [currentWorkspace]);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setCategoryName("");
    setCategoryDescription("");
    setCategoryColor(defaultColors[0]);
    setShowModal(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || "");
    setCategoryColor(category.color);
    setShowModal(true);
  };

  const handleOpenDelete = (category: Category) => {
    setCategoryToDelete(category);
    setShowDeleteModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setCategoryName("");
    setCategoryDescription("");
    setCategoryColor(defaultColors[0]);
    setError(null);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setCategoryToDelete(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !categoryName.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingCategory) {
        // Update
        const response = await fetch(`/api/categories/${editingCategory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: categoryName.trim(),
            description: categoryDescription.trim() || null,
            color: categoryColor,
            workspace_id: currentWorkspace.id,
          }),
        });
        if (!response.ok) throw new Error("Error al actualizar categoría");
      } else {
        // Create
        const response = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: categoryName.trim(),
            description: categoryDescription.trim() || null,
            color: categoryColor,
            workspace_id: currentWorkspace.id,
          }),
        });
        if (!response.ok) throw new Error("Error al crear categoría");
      }

      await fetchCategories();
      closeModal();
    } catch (err: any) {
      setError(err.message || "Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/categories/${categoryToDelete.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Error al eliminar categoría");

      await fetchCategories();
      closeDeleteModal();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProductCount = (category: Category) => {
    return category.products?.[0]?.count || 0;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Categorías de Productos</h2>
          <p className="text-sm text-text-secondary mt-1">
            Organiza tu catálogo con categorías personalizadas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCategories}
            disabled={loading}
            className="p-2 text-text-secondary hover:text-foreground hover:bg-hover-bg rounded-lg transition-colors disabled:opacity-50"
            title="Actualizar lista"
          >
            <HiRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm hover:shadow"
          >
            <HiPlus className="w-4 h-4" />
            Nueva Categoría
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Error State */}
      {error && !showModal && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg p-4 flex items-center gap-3">
          <HiXCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {categories.length === 0 ? (
            // Empty State
            <div className="text-center py-16 bg-background border border-dashed border-border rounded-xl">
              <div className="w-12 h-12 bg-hover-bg rounded-full flex items-center justify-center mx-auto mb-4">
                <HiTag className="w-6 h-6 text-text-tertiary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                No hay categorías
              </h3>
              <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
                Crea tu primera categoría para organizar tus productos.
              </p>
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-hover-bg transition-colors"
              >
                Crear Categoría
              </button>
            </div>
          ) : (
            // Categories Grid
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="group bg-background border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        <HiTag
                          className="w-5 h-5"
                          style={{ color: category.color }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          className="font-medium text-foreground truncate"
                          title={category.name}
                        >
                          {category.name}
                        </h3>
                        <p className="text-xs text-text-secondary">
                          {getProductCount(category)} productos
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEdit(category)}
                        className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <HiPencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenDelete(category)}
                        className="p-1.5 text-text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <HiTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {category.description && (
                    <p className="text-xs text-text-secondary line-clamp-2">
                      {category.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl max-w-md w-full shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
              </h3>
              <button onClick={closeModal} className="text-text-secondary hover:text-foreground">
                <HiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Ej. Electrónica, Ropa, Accesorios"
                  autoFocus
                  className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Descripción (opcional)
                </label>
                <textarea
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  placeholder="Breve descripción de la categoría"
                  rows={2}
                  className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Color
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {defaultColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCategoryColor(color)}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        categoryColor === color
                          ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-foreground hover:bg-hover-bg rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!categoryName.trim() || isSubmitting}
                  className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSubmitting && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  )}
                  {editingCategory ? "Guardar Cambios" : "Crear Categoría"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && categoryToDelete && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl max-w-sm w-full shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200 p-6">
            <h3 className="text-lg font-bold text-foreground mb-2">Eliminar Categoría</h3>
            <p className="text-sm text-text-secondary mb-6">
              ¿Estás seguro de eliminar <strong>{categoryToDelete.name}</strong>? Los productos perderán su categoría.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-foreground hover:bg-hover-bg rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isSubmitting && (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                )}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
