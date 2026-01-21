"use client";

import { useState } from "react";
import { useWorkspace } from "../providers/WorkspaceProvider";
import { HiOfficeBuilding, HiArrowRight, HiCheck } from "react-icons/hi";
import { useRouter } from "next/navigation";

interface CreateWorkspaceProps {
  onSuccess?: () => void;
  redirectTo?: string;
  isFirstWorkspace?: boolean;
}

export default function CreateWorkspace({ onSuccess, redirectTo, isFirstWorkspace = false }: CreateWorkspaceProps) {
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

      // Automatically switch to the new workspace
      if (newWorkspace.id) {
        await switchWorkspace(newWorkspace.id);
        
        if (onSuccess) {
            onSuccess();
        }

        if (redirectTo) {
            router.push(redirectTo);
        } else {
             // If no explicit redirect, force a refresh/navigation to dashboard to ensure context is clean
             // or let the parent handle it. 
             // Common behavior: go to dashboard.
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
    <div className="flex flex-col items-center justify-center p-4 animate-fadeIn w-full max-w-md mx-auto">
        <div className="text-center w-full">
            <div className="mx-auto h-20 w-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/5 ring-1 ring-primary/10">
                <HiOfficeBuilding className="h-10 w-10 text-primary" />
            </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            {isFirstWorkspace ? "Bienvenido a CRM-IA" : "Crear Nuevo Negocio"}
          </h2>
          <p className="mt-3 text-base text-text-secondary max-w-sm mx-auto">
            {isFirstWorkspace 
                ? "Para comenzar, crea tu primer espacio de trabajo."
                : "Expande tus horizontes creando un nuevo espacio para tu siguiente proyecto."}
          </p>
        </div>
        
        <form className="mt-10 w-full space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
                <div className="group">
                  <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-2 ml-1">
                    Nombre del Negocio
                  </label>
                  <div className="relative">
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        className="appearance-none block w-full px-4 py-3 rounded-xl border border-border bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 shadow-sm"
                        placeholder="Ej. Acme Corp"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-semibold text-foreground mb-2 ml-1">
                    Descripción <span className="text-text-tertiary font-normal">(Opcional)</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    className="appearance-none block w-full px-4 py-3 rounded-xl border border-border bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 resize-none shadow-sm"
                    placeholder="¿A qué se dedica tu negocio?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
            </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/10 p-4 border border-red-100 dark:border-red-900/20 animate-fadeIn">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Ocurrió un error
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !name}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-200 hover:-translate-y-0.5"
            >
              {isSubmitting ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
              ) : (
                <span className="absolute left-0 inset-y-0 flex items-center pl-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {/* Icon can go here */}
                </span>
              )}
              {isSubmitting ? 'Creando espacio...' : 'Crear Negocio'}
            </button>
          </div>
        </form>
    </div>
  );
}
