"use client";

import { useState, useEffect } from "react";
import { HiPlus, HiTrash, HiPencil, HiTag, HiXCircle, HiRefresh, HiX } from "react-icons/hi";
import { useWorkspace } from "@/app/providers/WorkspaceProvider";

interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export default function LabelsPage() {
  const { currentWorkspace } = useWorkspace();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Form/Action state
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTags = async () => {
    if (!currentWorkspace) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tags?workspace_id=${currentWorkspace.id}`);
      if (!response.ok) throw new Error("Error al cargar etiquetas");
      const data = await response.json();
      setTags(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, [currentWorkspace]);

  const handleOpenCreate = () => {
    setEditingTag(null);
    setTagName("");
    setShowModal(true);
  };

  const handleOpenEdit = (tag: Tag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setShowModal(true);
  };

  const handleOpenDelete = (tag: Tag) => {
    setTagToDelete(tag);
    setShowDeleteModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTag(null);
    setTagName("");
    setError(null);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setTagToDelete(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !tagName.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingTag) {
        // Update
        const response = await fetch(`/api/tags/${editingTag.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            name: tagName.trim(),
            workspace_id: currentWorkspace.id 
          }),
        });
        if (!response.ok) throw new Error("Error al actualizar etiqueta");
      } else {
        // Create
        const response = await fetch("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            name: tagName.trim(),
            workspace_id: currentWorkspace.id,
            color: "#6b7280" // Default gray color as requested (no color picker)
          }),
        });
        if (!response.ok) throw new Error("Error al crear etiqueta");
      }

      await fetchTags();
      closeModal();
    } catch (err: any) {
      setError(err.message || "Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!tagToDelete) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tags/${tagToDelete.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Error al eliminar etiqueta");
      
      await fetchTags();
      closeDeleteModal();
    } catch (err: any) {
      alert(err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Etiquetas</h2>
          <p className="text-sm text-text-secondary mt-1">
            Organiza tus conversaciones con etiquetas personalizadas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchTags}
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
            Nueva Etiqueta
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
            {tags.length === 0 ? (
                // Empty State
                <div className="text-center py-16 bg-background border border-dashed border-border rounded-xl">
                    <div className="w-12 h-12 bg-hover-bg rounded-full flex items-center justify-center mx-auto mb-4">
                        <HiTag className="w-6 h-6 text-text-tertiary" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-1">
                        No hay etiquetas
                    </h3>
                    <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
                        Crea tu primera etiqueta para empezar a clasificar tus chats.
                    </p>
                    <button
                        onClick={handleOpenCreate}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-hover-bg transition-colors"
                    >
                        Crear Etiqueta
                    </button>
                </div>
            ) : (
                // Tags Grid (Minimalist)
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {tags.map((tag) => (
                        <div 
                            key={tag.id}
                            className="group bg-background border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all duration-200 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500">
                                    <HiTag className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-medium text-foreground truncate max-w-[150px]" title={tag.name}>
                                        {tag.name}
                                    </h3>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleOpenEdit(tag)}
                                    className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                    title="Editar"
                                >
                                    <HiPencil className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleOpenDelete(tag)}
                                    className="p-1.5 text-text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Eliminar"
                                >
                                    <HiTrash className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-background rounded-xl max-w-sm w-full shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200">
              <div className="p-5 border-b border-border flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">
                      {editingTag ? "Editar Etiqueta" : "Nueva Etiqueta"}
                  </h3>
                  <button onClick={closeModal} className="text-text-secondary hover:text-foreground">
                      <HiX className="w-5 h-5" />
                  </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                  <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                          Nombre
                      </label>
                      <input 
                          type="text" 
                          value={tagName}
                          onChange={(e) => setTagName(e.target.value)}
                          placeholder="Ej. Ventas, Soporte, Urgente"
                          autoFocus
                          className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-all"
                      />
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
                          disabled={!tagName.trim() || isSubmitting}
                          className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                          {isSubmitting && (
                               <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          )}
                          {editingTag ? "Guardar Cambios" : "Crear Etiqueta"}
                      </button>
                  </div>
              </form>
           </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && tagToDelete && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-background rounded-xl max-w-sm w-full shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200 p-6">
               <h3 className="text-lg font-bold text-foreground mb-2">Eliminar Etiqueta</h3>
               <p className="text-sm text-text-secondary mb-6">
                   ¿Estás seguro de eliminar <strong>{tagToDelete.name}</strong>? Se desvinculará de las conversaciones.
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