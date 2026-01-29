"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HiMail, HiCheckCircle, HiX, HiRefresh, HiArrowLeft } from "react-icons/hi";
import { createClient } from "@/app/utils/supabase/client";
import Link from "next/link";

interface Invitation {
  id: string;
  email: string;
  token: string;
  workspace_id: string;
  workspace_name: string;
  role_name: string;
  inviter_email: string;
  message?: string;
  created_at: string;
}

export default function InvitationsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/invitations?my_invitations=true&status=pending');
      if (response.ok) {
        const data = await response.json();
        setInvitations(data);
      } else {
        setError("Error al cargar invitaciones");
      }
    } catch (err) {
      console.error("Error fetching invitations:", err);
      setError("Error al cargar invitaciones");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleAccept = async (token: string, id: string) => {
    try {
      setProcessingId(id);
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        setError(data.error || "Error al aceptar la invitación");
      }
    } catch (err) {
      console.error("Error accepting invitation:", err);
      setError("Error inesperado al aceptar la invitación");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (token: string, id: string) => {
    if (!confirm("¿Estás seguro de que deseas rechazar esta invitación?")) return;

    try {
      setProcessingId(id);
      const response = await fetch('/api/invitations/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        setInvitations(prev => prev.filter(inv => inv.id !== id));
      } else {
        setError("Error al rechazar la invitación");
      }
    } catch (err) {
      console.error("Error rejecting invitation:", err);
      setError("Error al rechazar la invitación");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
          >
            <HiArrowLeft className="w-5 h-5 text-text-secondary" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <HiMail className="w-7 h-7 text-primary" />
              Mis Invitaciones
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Invitaciones pendientes a espacios de trabajo
            </p>
          </div>
        </div>
        <button
          onClick={fetchInvitations}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
        >
          <HiRefresh className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : invitations.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 bg-background border border-border rounded-2xl">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6">
            <HiMail className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            No tienes invitaciones pendientes
          </h2>
          <p className="text-text-secondary max-w-md mx-auto">
            Cuando alguien te invite a un espacio de trabajo, aparecerá aquí.
          </p>
        </div>
      ) : (
        /* Invitations List */
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="bg-background border-2 border-border hover:border-primary/50 rounded-xl p-6 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <span className="text-xl font-bold text-primary">
                        {invitation.workspace_name?.charAt(0).toUpperCase() || 'W'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {invitation.workspace_name || 'Espacio de Trabajo'}
                      </h3>
                      <p className="text-sm text-text-secondary">
                        Invitado por {invitation.inviter_email}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                      Rol: {invitation.role_name}
                    </span>
                    <span className="px-3 py-1 bg-hover-bg text-text-secondary rounded-full text-sm">
                      {new Date(invitation.created_at).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  {invitation.message && (
                    <p className="text-sm text-text-secondary bg-hover-bg rounded-lg p-3 italic">
                      "{invitation.message}"
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => handleAccept(invitation.token, invitation.id)}
                    disabled={processingId === invitation.id}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
                  >
                    {processingId === invitation.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <HiCheckCircle className="w-5 h-5" />
                    )}
                    Aceptar
                  </button>
                  <button
                    onClick={() => handleReject(invitation.token, invitation.id)}
                    disabled={processingId === invitation.id}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium disabled:opacity-50"
                  >
                    <HiX className="w-5 h-5" />
                    Rechazar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
