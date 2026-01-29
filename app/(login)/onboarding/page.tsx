"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  HiOfficeBuilding,
  HiCheckCircle,
  HiArrowLeft,
  HiLogout,
  HiMail,
  HiX,
  HiBriefcase
} from "react-icons/hi";
import { createClient } from "@/app/utils/supabase/client";
import type { PendingInvitation } from "@/app/types/invitations";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [checkingInvitations, setCheckingInvitations] = useState(true);

  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        const response = await fetch('/api/invitations?my_invitations=true&status=pending');
        if (response.ok) {
          const data = await response.json();
          setInvitations(data);
        }
      } catch (error) {
        console.error("Error fetching invitations:", error);
      } finally {
        setCheckingInvitations(false);
      }
    };

    fetchInvitations();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleAcceptInvitation = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update local storage and redirect
        if (data.workspace_id) {
          localStorage.setItem('last_workspace_id', data.workspace_id);
          // Set as default workspace in Supabase
          await supabase.auth.updateUser({
            data: { default_workspace_id: data.workspace_id }
          });
        }
        router.push("/dashboard");
      } else {
        alert(data.error || "Error al aceptar la invitación");
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
      alert("Error inesperado al aceptar la invitación");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectInvitation = async (token: string) => {
    if (!confirm("¿Estás seguro de que deseas rechazar esta invitación?")) return;

    try {
      const response = await fetch('/api/invitations/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        setInvitations(prev => prev.filter(inv => inv.token !== token));
      } else {
        alert("Error al rechazar la invitación");
      }
    } catch (error) {
      console.error("Error rejecting invitation:", error);
    }
  };

  // Simplified form data - only business name and description
  const [formData, setFormData] = useState({
    businessName: "",
    businessDescription: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuario no autenticado");
      }

      // Create workspace slug from business name
      const slug = formData.businessName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name: formData.businessName,
          slug: `${slug}-${Date.now()}`, // Add timestamp to ensure uniqueness
          description: formData.businessDescription || `Workspace para ${formData.businessName}`,
          owner_id: user.id
        })
        .select()
        .single();

      if (workspaceError) {
        console.error("Error creating workspace:", workspaceError);
        throw new Error("Error al crear el espacio de trabajo");
      }

      // Set this workspace as default
      if (workspace) {
        await supabase.auth.updateUser({
          data: { default_workspace_id: workspace.id }
        });
        
        // Also save locally
        localStorage.setItem('last_workspace_id', workspace.id);
      }

      // Redirect to dashboard - WorkspaceProvider will auto-load the workspace
      router.refresh(); // Force refresh to update server components and middleware state
      router.push("/dashboard");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      alert("Error al crear tu negocio. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return formData.businessName.trim() !== "";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col p-6" suppressHydrationWarning>
      {/* Header with Logout */}
      <div className="w-full max-w-2xl mx-auto flex justify-end mb-4">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <HiLogout className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center py-8">
        <div className="max-w-2xl w-full space-y-8">
          {/* Logo */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Image src="/botia.svg" alt="Botia" width={80} height={80} priority />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Bienvenido a Botia CRM
            </h1>
            <p className="text-text-secondary">
              Configuremos tu cuenta rápidamente
            </p>
          </div>

          {/* Pending Invitations Section */}
          {!checkingInvitations && invitations.length > 0 && (
            <div className="bg-background border border-border rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                  <HiMail className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Tienes invitaciones pendientes
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Únete a un equipo existente en lugar de crear uno nuevo
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {invitations.map((invitation: any) => (
                  <div 
                    key={invitation.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-hover-bg rounded-xl border border-border"
                  >
                    <div>
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <HiBriefcase className="text-text-tertiary" />
                        {invitation.workspace?.name || 'Unirse al equipo'}
                      </h3>
                      <p className="text-sm text-text-secondary mt-1">
                        Invitación de {invitation.invited_by_user?.email || 'un administrador'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRejectInvitation(invitation.token)}
                        className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1"
                        disabled={loading}
                      >
                        <HiX className="w-4 h-4" />
                        Rechazar
                      </button>
                      <button
                        onClick={() => handleAcceptInvitation(invitation.token)}
                        className="px-4 py-2 text-sm font-medium bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-1"
                        disabled={loading}
                      >
                        {loading ? 'Procesando...' : (
                          <>
                            <HiCheckCircle className="w-4 h-4" />
                            Aceptar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create Business Form */}
          <div className="bg-background border border-border rounded-2xl p-8 shadow-lg">
            <div className="mb-6">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <HiOfficeBuilding className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Crear Nuevo Negocio
              </h2>
              <p className="text-text-secondary">
                O si prefieres, crea tu propio espacio de trabajo
              </p>
            </div>

            <div className="space-y-6">
              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nombre del Negocio *
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  placeholder="Ej: Mi Empresa SAC"
                  className="w-full px-4 py-3 bg-input-bg border border-input-border text-foreground placeholder:text-text-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                />
              </div>

              {/* Business Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={formData.businessDescription}
                  onChange={(e) => handleInputChange("businessDescription", e.target.value)}
                  placeholder="Describe brevemente tu negocio..."
                  rows={4}
                  className="w-full px-4 py-3 bg-input-bg border border-input-border text-foreground placeholder:text-text-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors resize-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <button
                onClick={() => router.push("/welcome")}
                className="px-6 py-3 bg-hover-bg text-foreground rounded-lg hover:bg-opacity-80 transition-colors font-medium flex items-center gap-2"
              >
                <HiArrowLeft className="w-5 h-5" />
                Volver
              </button>

              <button
                onClick={handleComplete}
                disabled={!isFormValid() || loading}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Creando...
                  </>
                ) : (
                  <>
                    Crear Negocio
                    <HiCheckCircle className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Footer Help */}
          <div className="text-center mt-6">
            <p className="text-sm text-text-secondary">
              ¿Necesitas ayuda?{" "}
              <a href="#" className="text-primary hover:underline font-medium">
                Contacta con soporte
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}