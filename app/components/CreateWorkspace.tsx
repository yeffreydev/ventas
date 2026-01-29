"use client";

import { useState } from "react";
import { useWorkspace } from "../providers/WorkspaceProvider";
import { HiOfficeBuilding, HiArrowRight, HiCheck } from "react-icons/hi";
import { useRouter } from "next/navigation";

interface CreateWorkspaceProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export default function CreateWorkspace({ onSuccess, redirectTo }: CreateWorkspaceProps) {
  const { createWorkspace, switchWorkspace } = useWorkspace();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Auto-generate slug
      const timestamp = Math.floor(Date.now() / 1000);
      const slug = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') 
        + '-' + timestamp; // Ensure uniqueness

      const newWorkspace = await createWorkspace(name, slug, description);
      
      if (!newWorkspace) {
        setError("Error al crear el negocio. Inténtalo de nuevo.");
        setIsSubmitting(false);
        return;
      }

      // Automatically switch to the new workspace and set as default
      if (newWorkspace.id) {
        await switchWorkspace(newWorkspace.id);
        
        if (onSuccess) {
            onSuccess();
        }

        if (redirectTo) {
            router.push(redirectTo);
        } else {
             router.push('/dashboard');
        }
      }

    } catch (err) {
      console.error(err);
      setError("Ocurrió un error inesperado.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 w-full max-w-md mx-auto">
        <div className="text-center w-full mb-8">
            <div className="mx-auto h-16 w-16 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <HiOfficeBuilding className="h-8 w-8 text-primary" />
            </div>
          <h2 className="text-2xl font-bold text-foreground">
            Crear Nuevo Negocio
          </h2>
          <p className="mt-2 text-text-secondary">
             Solo necesitamos el nombre y una breve descripción
          </p>
        </div>
        
        <form className="w-full space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                    Nombre del Negocio *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-border bg-input-bg text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="Ej. Mi Empresa"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
                    Descripción (Opcional)
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-input-bg text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                    placeholder="Breve descripción..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
            </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !name}
              className="w-full flex justify-center py-3 px-4 rounded-lg text-white bg-primary hover:bg-primary/90 font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creando...' : 'Crear Negocio'}
            </button>
          </div>
        </form>
    </div>
  );
}
