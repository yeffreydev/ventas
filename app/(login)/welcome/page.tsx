"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { HiOfficeBuilding, HiUserGroup, HiArrowRight, HiBell, HiLogout, HiRefresh, HiCheckCircle, HiX } from "react-icons/hi";
import { createClient } from "@/app/utils/supabase/client";
import type { PendingInvitation } from "@/app/types/invitations";

export default function WelcomePage() {
  const router = useRouter();
  const supabase = createClient();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchInvitations = async () => {
    setLoadingInvitations(true);
    try {
      const response = await fetch('/api/invitations?my_invitations=true&status=pending');
      if (response.ok) {
        const data = await response.json();
        setInvitations(data);
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
    } finally {
      setLoadingInvitations(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      router.push("/login");
      router.refresh(); 
    }
  };

  const handleAcceptInvitation = async (token: string, id: string) => {
    try {
      setProcessingId(id);
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.workspace_id) {
          localStorage.setItem('last_workspace_id', data.workspace_id);
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
      setProcessingId(null);
    }
  };

  const handleRejectInvitation = async (token: string, id: string) => {
    if (!confirm("¿Estás seguro de que deseas rechazar esta invitación?")) return;

    try {
      setProcessingId(id);
      const response = await fetch('/api/invitations/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        setInvitations(prev => prev.filter(inv => inv.id !== id));
      } else {
        alert("Error al rechazar la invitación");
      }
    } catch (error) {
      console.error("Error rejecting invitation:", error);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col p-6">
      {/* Header with Logout */}
      <div className="w-full max-w-5xl mx-auto flex justify-end mb-4 relative z-50">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50/50 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg transition-colors shadow-sm"
        >
          <HiLogout className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center">
      <div className="max-w-5xl w-full">
        {/* Logo and Title */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <Image src="/botia.svg" alt="Botia" width={100} height={100} />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">
            ¡Bienvenido a Botia CRM!
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Gestiona tu negocio de manera eficiente con nuestra plataforma todo-en-uno
          </p>
        </div>

        {/* Options Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Option 1: Create Business */}
          <div
            onClick={() => router.push("/onboarding")}
            className="group relative bg-background border-2 border-border hover:border-primary rounded-2xl p-8 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1"
          >
            <div className="absolute top-6 right-6">
              <HiArrowRight className="w-6 h-6 text-text-tertiary group-hover:text-primary transition-colors" />
            </div>

            <div className="mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <HiOfficeBuilding className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Crear mi negocio
              </h2>
              <p className="text-text-secondary">
                Configura tu propio espacio de trabajo y comienza a gestionar tu negocio
              </p>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <span>Gestión completa de clientes</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <span>Chat multicanal integrado</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <span>Informes y análisis en tiempo real</span>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 text-primary font-semibold group-hover:gap-3 transition-all">
              Empezar ahora
              <HiArrowRight className="w-5 h-5" />
            </div>
          </div>

          {/* Option 2: Invitations */}
          <div className="group relative bg-background border-2 border-border hover:border-indigo-500 rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/20 cursor-default">
            <div className="flex justify-between items-start mb-6">
              <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                <HiBell className="w-8 h-8 text-indigo-500" />
              </div>
              <button
                 onClick={fetchInvitations}
                 disabled={loadingInvitations}
                 className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                 title="Refrescar invitaciones"
              >
                <HiRefresh className={`w-5 h-5 ${loadingInvitations ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-2">
              Invitaciones
            </h2>

            <div className="min-h-[160px]">
              {invitations.length > 0 ? (
                <div className="space-y-3 mt-4">
                  {invitations.map((invitation: any) => (
                    <div key={invitation.id} className="p-3 bg-hover-bg rounded-xl border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-foreground text-sm">
                            {invitation.workspace?.name || 'Nuevo Workspace'}
                          </h3>
                          <p className="text-xs text-text-secondary">
                            De: {invitation.invited_by_user?.email || 'Admin'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleRejectInvitation(invitation.token, invitation.id)}
                          disabled={processingId === invitation.id}
                          className="flex-1 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <HiX className="w-3 h-3" /> Rechazar
                        </button>
                        <button
                          onClick={() => handleAcceptInvitation(invitation.token, invitation.id)}
                          disabled={processingId === invitation.id}
                          className="flex-1 px-2 py-1.5 text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-600 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          {processingId === invitation.id ? (
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          ) : (
                            <>
                              <HiCheckCircle className="w-3 h-3" /> Aceptar
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col justify-center">
                  <p className="text-text-secondary mb-4">
                    Aún no tienes invitaciones.
                  </p>
                  <p className="text-sm text-text-tertiary">
                    Usa el botón de refrescar para actualizar.
                  </p>
                </div>
              )}
            </div>

            {invitations.length === 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                 <button 
                  onClick={fetchInvitations}
                  className="w-full py-2 text-indigo-500 font-medium text-sm hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                 >
                   <HiRefresh className="w-4 h-4" />
                   Refrescar invitaciones
                 </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Help */}
        <div className="text-center mt-12">
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
