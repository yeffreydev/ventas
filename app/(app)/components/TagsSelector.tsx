'use client';

import { useState, useEffect } from 'react';
import { HiPlus, HiRefresh } from 'react-icons/hi';
import { useRouter } from 'next/navigation';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagsSelectorProps {
  selectedTags: string[];
  onTagsChange: (tagIds: string[]) => void;
  workspaceId: string;
  allowCreate?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function TagsSelector({
  selectedTags,
  onTagsChange,
  workspaceId,
  allowCreate = false,
  disabled = false,
  className = ''
}: TagsSelectorProps) {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = async () => {
    if (!workspaceId) {
      setError('Workspace ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/tags?workspace_id=${workspaceId}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar etiquetas');
      }
      
      const data = await response.json();
      setTags(data);
    } catch (err: any) {
      console.error('Error fetching tags:', err);
      setError(err.message || 'Error al cargar etiquetas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, [workspaceId]);

  const handleTagToggle = (tagId: string) => {
    if (disabled) return;
    
    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];
    
    onTagsChange(newSelectedTags);
  };

  const handleCreateRedirect = () => {
    router.push('/config/labels');
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-4 ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2 text-sm text-text-secondary">Cargando etiquetas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchTags}
            className="ml-2 p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors"
            title="Reintentar"
          >
            <HiRefresh className="w-4 h-4 text-red-600 dark:text-red-400" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-foreground">Etiquetas</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchTags}
            disabled={loading}
            className="p-1.5 text-text-secondary hover:text-foreground hover:bg-hover-bg rounded-lg transition-colors disabled:opacity-50"
            title="Actualizar lista"
          >
            <HiRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {allowCreate && (
            <button
              type="button"
              onClick={handleCreateRedirect}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-medium rounded-lg hover:bg-primary/20 transition-colors"
            >
              <HiPlus className="w-3.5 h-3.5" />
              Gestionar Etiquetas
            </button>
          )}
        </div>
      </div>

      {tags.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border rounded-lg bg-hover-bg/30">
          <p className="text-sm text-text-secondary mb-2">No hay etiquetas disponibles</p>
          {allowCreate && (
            <button
              type="button"
              onClick={handleCreateRedirect}
              className="text-xs text-primary hover:underline font-medium"
            >
              Crear primera etiqueta
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => {
            const isSelected = selectedTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleTagToggle(tag.id)}
                disabled={disabled}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  isSelected
                    ? 'bg-primary text-white shadow-lg scale-105'
                    : 'bg-hover-bg text-foreground opacity-60 hover:opacity-100 hover:scale-105'
                }`}
                title={isSelected ? `Clic para quitar "${tag.name}"` : `Clic para agregar "${tag.name}"`}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      )}

      {tags.length > 0 && selectedTags.length > 0 && (
        <p className="text-xs text-text-secondary mt-2">
          {selectedTags.length} {selectedTags.length === 1 ? 'etiqueta seleccionada' : 'etiquetas seleccionadas'}
        </p>
      )}
    </div>
  );
}
