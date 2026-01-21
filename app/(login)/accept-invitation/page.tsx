"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import { HiCheckCircle, HiXCircle, HiMail } from "react-icons/hi";
import Link from "next/link";
import Image from "next/image";
import type { PendingInvitation } from "@/app/types/invitations";

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const supabase = createClient();

  const [invitation, setInvitation] = useState<PendingInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkInvitation();
    checkUser();
  }, [token]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const checkInvitation = async () => {
    if (!token) {
      setError("Token de invitación no válido");
      setIsLoading(false);
      return;
    }

    try {
      // Check if invitation is valid
      const { data: isValid, error: validError } = await supabase.rpc(
        "is_invitation_valid",
        { invitation_token: token }
      );

      if (validError || !isValid) {
        setError("La invitación no es válida o ha expirado");
        setIsLoading(false);
        return;
      }

      // Get invitation details
      const { data: invitations, error: invError } = await supabase
        .from("pending_invitations")
        .select("*")
        .eq("token", token)
        .single();

      if (invError || !invitations) {
        setError("No se pudo cargar la invitación");
        setIsLoading(false);
        return;
      }

      setInvitation(invitations);
    } catch (err) {
      console.error("Error checking invitation:", err);
      setError("Error al verificar la invitación");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Check if user is logged in
      if (!user) {
        // Redirect to register with invitation token
        router.push(`/register?invitation=${token}`);
        return;
      }

      // Accept invitation
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al aceptar invitación");
      }

      setSuccess(true);

      // Redirect to dashboard with refresh parameter and workspace ID after 2 seconds
      const workspaceId = data.workspace_id;
      console.log('Invitation accepted, workspace_id:', workspaceId);
      const redirectUrl = workspaceId
        ? `/dashboard?workspace_refresh=true&invited_workspace=${workspaceId}`
        : "/dashboard?workspace_refresh=true";

      setTimeout(() => {
        console.log('Redirecting to:', redirectUrl);
        router.push(redirectUrl);
      }, 2000);
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      setError(err.message || "Error al aceptar la invitación");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!token || !user) return;

    if (!confirm("¿Estás seguro de rechazar esta invitación?")) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/invitations/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al rechazar invitación");
      }

      router.push("/dashboard");
    } catch (err: any) {
      console.error("Error rejecting invitation:", err);
      setError(err.message || "Error al rechazar la invitación");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-background rounded-2xl shadow-xl p-8 border border-current/20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
              <HiCheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              ¡Invitación Aceptada!
            </h2>
            <p className="text-text-secondary mb-6">
              Ahora eres parte del equipo. Redirigiendo al dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-background rounded-2xl shadow-xl p-8 border border-current/20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
              <HiXCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Invitación No Válida
            </h2>
            <p className="text-text-secondary mb-6">
              {error || "La invitación no existe o ha expirado"}
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Ir al Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full">
        <div className="bg-background rounded-2xl shadow-xl p-8 border border-current/20">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image src="/botia.svg" alt="Botia Logo" width={80} height={80} />
          </div>

          {/* Invitation Icon */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full">
              <HiMail className="w-8 h-8 text-primary" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-foreground text-center mb-2">
            Invitación para ser Agente
          </h2>
          
          {/* Workspace Info - Prominent */}
          {invitation.workspace_id && (
            <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-4 mb-4">
              <div className="text-center">
                <p className="text-xs text-text-secondary mb-1">Te están invitando a unirte a</p>
                <h3 className="text-xl font-bold text-primary">
                  {(invitation as any).workspace_name || 'Espacio de Trabajo'}
                </h3>
              </div>
            </div>
          )}

          {/* Invitation Details */}
          <div className="bg-hover-bg rounded-lg p-4 mb-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Invitado por:</span>
                <span className="font-medium text-foreground">
                  {invitation.inviter_name || invitation.inviter_email}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Rol:</span>
                <span className="font-medium text-foreground">
                  {invitation.role_name}
                </span>
              </div>
              {invitation.display_name && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Nombre:</span>
                  <span className="font-medium text-foreground">
                    {invitation.display_name}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-secondary">Chats máximos:</span>
                <span className="font-medium text-foreground">
                  {invitation.max_concurrent_chats}
                </span>
              </div>
              {invitation.specialties && invitation.specialties.length > 0 && (
                <div>
                  <span className="text-text-secondary">Especialidades:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {invitation.specialties.map((specialty, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {invitation.languages && invitation.languages.length > 0 && (
                <div>
                  <span className="text-text-secondary">Idiomas:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {invitation.languages.map((lang, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs"
                      >
                        {lang.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {invitation.message && (
              <div className="mt-4 pt-4 border-t border-current/20">
                <p className="text-sm text-text-secondary italic">
                  "{invitation.message}"
                </p>
              </div>
            )}
          </div>

          {/* User Status */}
          {!user ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Necesitas crear una cuenta o iniciar sesión para aceptar esta invitación.
              </p>
            </div>
          ) : user.email !== invitation.email ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Esta invitación es para <strong>{invitation.email}</strong>.
                Estás conectado como <strong>{user.email}</strong>.
              </p>
            </div>
          ) : null}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleAccept}
              disabled={isProcessing || (user && user.email !== invitation.email)}
              className="w-full py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Procesando...
                </>
              ) : user ? (
                <>
                  <HiCheckCircle className="w-5 h-5" />
                  Aceptar Invitación
                </>
              ) : (
                "Crear Cuenta y Aceptar"
              )}
            </button>

            {user && user.email === invitation.email && (
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="w-full py-3 px-4 border border-current/20 text-text-secondary rounded-lg hover:bg-hover-bg transition-colors font-medium disabled:opacity-50"
              >
                Rechazar
              </button>
            )}

            {!user && (
              <Link
                href={`/login?redirect=/accept-invitation?token=${token}`}
                className="block w-full py-3 px-4 border border-current/20 text-center text-text-secondary rounded-lg hover:bg-hover-bg transition-colors font-medium"
              >
                Ya tengo cuenta
              </Link>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}