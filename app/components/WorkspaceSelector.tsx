"use client";

import { useState } from "react";
import { HiOfficeBuilding, HiCheck, HiUsers, HiRefresh } from "react-icons/hi";
import { HiRocketLaunch } from "react-icons/hi2";
import { useWorkspace } from "../providers/WorkspaceProvider";
import CreateWorkspace from "./CreateWorkspace";

interface WorkspaceSelectorProps {
  showCreateOption?: boolean;
}

export default function WorkspaceSelector({ showCreateOption = true }: WorkspaceSelectorProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { workspaces, switchWorkspace, isLoading, refreshWorkspaces } = useWorkspace();
  
  // Separate owned and guest workspaces
  const ownedWorkspaces = workspaces.filter((w: any) => w.is_owner);
  const guestWorkspaces = workspaces.filter((w: any) => !w.is_owner);

  if (showCreateForm) {
    return <CreateWorkspace />;
  }

  const handleSelectWorkspace = async (workspaceId: string) => {
    await switchWorkspace(workspaceId);
  };

  const handleRefresh = async () => {
    await refreshWorkspaces();
  };

  // If no workspaces at all, show empty state with option to create
  // Note: Loading state is handled by the parent layout
  if (workspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-4 animate-fadeIn w-full max-w-2xl mx-auto min-h-[60vh]">
        <div className="text-center w-full space-y-8">
          <div className="mx-auto h-32 w-32 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center shadow-xl shadow-primary/10 ring-1 ring-primary/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]"></div>
            <HiRocketLaunch className="h-16 w-16 text-primary relative z-10 animate-bounce-slow" />
          </div>

          <div className="space-y-4 max-w-lg mx-auto">
            <h2 className="text-4xl font-bold tracking-tight text-foreground">
              ¡Bienvenido a CRM-IA!
            </h2>
            <p className="text-lg text-text-secondary leading-relaxed">
              No encontramos espacios de trabajo asociados a tu cuenta. Crea uno nuevo para comenzar.
            </p>
          </div>

          <div className="pt-8 space-y-4">
            <button
              onClick={() => setShowCreateForm(true)}
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white transition-all duration-200 bg-primary rounded-full hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-lg hover:shadow-primary/30 hover:-translate-y-1"
            >
              <HiOfficeBuilding className="w-6 h-6 mr-2 opacity-90" />
              Crear Nuevo Negocio
            </button>
            
            <div className="flex items-center justify-center">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary hover:text-primary transition-colors disabled:opacity-50"
              >
                <HiRefresh className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Recargando...' : 'Recargar mis espacios de trabajo'}
              </button>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-sm text-text-tertiary pt-4">
              <div className="h-px w-12 bg-border"></div>
              <span>¿Ya tienes una invitación? Recarga para verla</span>
              <div className="h-px w-12 bg-border"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If has workspaces but somehow no current workspace selected
  // This is a fallback - normally shouldn't happen as WorkspaceProvider auto-selects
  return (
    <div className="flex flex-col items-center justify-center p-4 animate-fadeIn w-full max-w-3xl mx-auto min-h-[60vh]">
      <div className="text-center w-full space-y-8">
        <div className="mx-auto h-24 w-24 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center shadow-xl shadow-primary/10 ring-1 ring-primary/20">
          <HiOfficeBuilding className="h-12 w-12 text-primary" />
        </div>

        <div className="space-y-3 max-w-lg mx-auto">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Selecciona un espacio de trabajo
          </h2>
          <p className="text-base text-text-secondary leading-relaxed">
            Tienes acceso a {workspaces.length} espacio{workspaces.length !== 1 ? 's' : ''} de trabajo. Elige uno para continuar.
          </p>
        </div>

        <div className="w-full max-w-xl mx-auto space-y-6">
          {/* Owned Workspaces */}
          {ownedWorkspaces.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-2">
                <HiOfficeBuilding className="w-4 h-4" />
                Mis Negocios ({ownedWorkspaces.length})
              </h3>
              <div className="grid gap-3">
                {ownedWorkspaces.map((workspace: any) => (
                  <button
                    key={workspace.id}
                    onClick={() => handleSelectWorkspace(workspace.id)}
                    disabled={isLoading}
                    className="w-full flex items-center justify-between p-4 bg-background border border-border rounded-xl hover:border-primary hover:bg-hover-bg transition-all duration-200 group shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/20">
                        {workspace.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {workspace.name}
                        </h4>
                        <p className="text-sm text-text-secondary">
                          Propietario • {workspace.description || 'Sin descripción'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-sm font-medium">Entrar</span>
                      <HiCheck className="w-5 h-5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Guest Workspaces */}
          {guestWorkspaces.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-2">
                <HiUsers className="w-4 h-4" />
                Invitado ({guestWorkspaces.length})
              </h3>
              <div className="grid gap-3">
                {guestWorkspaces.map((workspace: any) => (
                  <button
                    key={workspace.id}
                    onClick={() => handleSelectWorkspace(workspace.id)}
                    disabled={isLoading}
                    className="w-full flex items-center justify-between p-4 bg-background border border-border rounded-xl hover:border-primary hover:bg-hover-bg transition-all duration-200 group shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                        {workspace.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {workspace.name}
                        </h4>
                        <p className="text-sm text-text-secondary">
                          Invitado • Rol: {workspace.role || 'Agente'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-sm font-medium">Entrar</span>
                      <HiCheck className="w-5 h-5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Create new workspace option */}
          {showCreateOption && (
            <div className="pt-4 border-t border-border">
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-hover-bg transition-all duration-200 text-text-secondary hover:text-primary"
              >
                <HiOfficeBuilding className="w-5 h-5" />
                <span className="font-medium">Crear nuevo negocio</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
