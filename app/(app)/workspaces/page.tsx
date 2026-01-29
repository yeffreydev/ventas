"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { HiOfficeBuilding, HiCheck, HiUsers, HiLogout, HiPlus, HiStar } from "react-icons/hi";
import { useWorkspace } from "../../providers/WorkspaceProvider";
import { createClient } from "../../utils/supabase/client";

export default function WorkspacesPage() {
  const router = useRouter();
  const supabase = createClient();
  const { workspaces, currentWorkspace, switchWorkspace, isLoading } = useWorkspace();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [markAsDefault, setMarkAsDefault] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  // Separate owned and guest workspaces
  const ownedWorkspaces = workspaces.filter((w: any) => w.is_owner);
  const guestWorkspaces = workspaces.filter((w: any) => !w.is_owner);

  const handleSelectWorkspace = async (workspaceId: string) => {
    setIsSwitching(true);
    try {
      // Save as default if checkbox is checked
      if (markAsDefault) {
        await supabase.auth.updateUser({
          data: { default_workspace_id: workspaceId }
        });
      }
      
      // Switch to workspace
      await switchWorkspace(workspaceId);
      
      // Router push is handled by switchWorkspace, but just in case:
      router.push('/dashboard');
    } catch (error) {
      console.error('Error selecting workspace:', error);
      setIsSwitching(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (isSwitching) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-primary/20 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Preparando workspace
            </h3>
            <p className="text-text-secondary">
              Cargando tu espacio de trabajo...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-current/20 px-6 flex items-center justify-between bg-background sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Image src="/botia.svg" alt="Botia" width={32} height={32} />
          <h1 className="text-xl font-bold text-primary hidden sm:block">Botia CRM</h1>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <HiLogout className="w-4 h-4" />
          <span className="hidden sm:inline">Cerrar Sesión</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          {/* Title Section */}
          <div className="text-center mb-8">
            <div className="mx-auto h-20 w-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center shadow-lg shadow-primary/10 ring-1 ring-primary/20 mb-6">
              <HiOfficeBuilding className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              Selecciona tu espacio de trabajo
            </h2>
            <p className="text-base text-text-secondary">
              Tienes acceso a {workspaces.length} espacio{workspaces.length !== 1 ? 's' : ''} de trabajo. Elige uno para continuar.
            </p>
          </div>

          {/* Workspaces Grid */}
          <div className="space-y-6">
            {/* Owned Workspaces */}
            {ownedWorkspaces.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-2 px-2">
                  <HiOfficeBuilding className="w-4 h-4" />
                  Mis Negocios ({ownedWorkspaces.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {ownedWorkspaces.map((workspace: any) => (
                    <div
                      key={workspace.id}
                      className={`relative group bg-background border-2 rounded-xl p-6 transition-all duration-200 cursor-pointer hover:shadow-lg ${
                        selectedWorkspaceId === workspace.id
                          ? 'border-primary shadow-lg shadow-primary/20'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedWorkspaceId(workspace.id)}
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/30 flex-shrink-0">
                          {workspace.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-lg text-foreground mb-1 truncate">
                            {workspace.name}
                          </h4>
                          <p className="text-sm text-text-secondary line-clamp-2">
                            {workspace.description || 'Sin descripción'}
                          </p>
                          <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                            <HiStar className="w-3 h-3" />
                            Propietario
                          </span>
                        </div>
                      </div>
                      {selectedWorkspaceId === workspace.id && (
                        <div className="absolute top-4 right-4">
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <HiCheck className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Guest Workspaces */}
            {guestWorkspaces.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-2 px-2">
                  <HiUsers className="w-4 h-4" />
                  Invitado ({guestWorkspaces.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {guestWorkspaces.map((workspace: any) => (
                    <div
                      key={workspace.id}
                      className={`relative group bg-background border-2 rounded-xl p-6 transition-all duration-200 cursor-pointer hover:shadow-lg ${
                        selectedWorkspaceId === workspace.id
                          ? 'border-primary shadow-lg shadow-primary/20'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedWorkspaceId(workspace.id)}
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                          {workspace.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-lg text-foreground mb-1 truncate">
                            {workspace.name}
                          </h4>
                          <p className="text-sm text-text-secondary line-clamp-2">
                            {workspace.description || 'Sin descripción'}
                          </p>
                          <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-text-secondary text-xs font-medium rounded-full">
                            <HiUsers className="w-3 h-3" />
                            Rol: {workspace.role || 'Agente'}
                          </span>
                        </div>
                      </div>
                      {selectedWorkspaceId === workspace.id && (
                        <div className="absolute top-4 right-4">
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <HiCheck className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Default Workspace Checkbox */}
          {selectedWorkspaceId && (
            <div className="mt-6 flex justify-center">
              <label className="flex items-center gap-3 p-4 bg-hover-bg rounded-lg cursor-pointer hover:bg-opacity-80 transition-colors">
                <input
                  type="checkbox"
                  checked={markAsDefault}
                  onChange={(e) => setMarkAsDefault(e.target.checked)}
                  className="w-5 h-5 text-primary border-input-border rounded focus:ring-primary cursor-pointer"
                />
                <div className="flex items-center gap-2">
                  <HiStar className="w-5 h-5 text-primary" />
                  <span className="font-medium text-foreground">
                    Marcar como espacio de trabajo predeterminado
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => selectedWorkspaceId && handleSelectWorkspace(selectedWorkspaceId)}
              disabled={!selectedWorkspaceId || isLoading}
              className="px-8 py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Cargando...
                </>
              ) : (
                <>
                  Continuar
                  <HiCheck className="w-5 h-5" />
                </>
              )}
            </button>

            <button
              onClick={() => router.push('/create-workspace')}
              className="px-8 py-4 bg-background border-2 border-dashed border-border text-foreground rounded-xl font-semibold hover:border-primary hover:bg-hover-bg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <HiPlus className="w-5 h-5" />
              Crear nuevo negocio
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
