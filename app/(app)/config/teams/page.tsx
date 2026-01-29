"use client";

import { useState, useEffect } from "react";
import { HiTrash, HiUserCircle, HiMail, HiClipboard, HiCheck, HiShieldCheck, HiPencil } from "react-icons/hi";
import type { Role, UserRole, AgentProfile } from "@/app/types/roles-agents";
import type { PendingInvitation } from "@/app/types/invitations";
import { useWorkspace } from "@/app/providers/WorkspaceProvider";
import RolesManagement from "./components/RolesManagement";

interface User {
  id: string;
  email: string;
  raw_user_meta_data?: {
    display_name?: string;
  };
}

interface AgentWithRole extends AgentProfile {
  role_id?: string;
  role_name?: string;
  email?: string;
}

interface RoleAssignmentConfirmation {
  agentId: string;
  agentName: string;
  roleId: string;
  roleName: string;
}

interface EditingAgentName {
  userId: string;
  currentName: string;
}

export default function TeamsPage() {
   const [roles, setRoles] = useState<Role[]>([]);
   const [agents, setAgents] = useState<AgentWithRole[]>([]);
   const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [showInviteModal, setShowInviteModal] = useState(false);
   const [inviteFormData, setInviteFormData] = useState({
     email: "",
     role_id: "",
     message: "",
   });
  const [copiedLink, setCopiedLink] = useState(false);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roleAssignmentConfirmation, setRoleAssignmentConfirmation] = useState<RoleAssignmentConfirmation | null>(null);
  const [assigningRole, setAssigningRole] = useState(false);
  const [sendingInvitation, setSendingInvitation] = useState(false);
  const [editingAgentName, setEditingAgentName] = useState<EditingAgentName | null>(null);
  const [savingAgentName, setSavingAgentName] = useState(false);

  const { currentWorkspace } = useWorkspace();

  useEffect(() => {
    if (currentWorkspace) {
        fetchData();
    }
  }, [currentWorkspace]);

  const fetchData = async () => {
    if (!currentWorkspace) return;

    setIsLoading(true);
    try {
      const [rolesRes, agentsRes, invitationsRes] = await Promise.all([
        fetch(`/api/roles?workspace_id=${currentWorkspace.id}`),
        fetch(`/api/agents?workspace_id=${currentWorkspace.id}`),
        fetch(`/api/invitations?workspace_id=${currentWorkspace.id}`),
      ]);

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        // Filter out super_admin role only
        setRoles(rolesData.filter((r: Role) => r.slug !== 'super_admin'));
      }
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        // Fetch user roles for each agent
        const agentsWithRoles = await Promise.all(
          agentsData.map(async (agent: AgentProfile) => {
            try {
              const userRolesRes = await fetch(`/api/user-roles?user_id=${agent.user_id}`);
              if (userRolesRes.ok) {
                const userRoles = await userRolesRes.json();
                const primaryRole = userRoles[0]; // Get first role
                return {
                  ...agent,
                  role_id: primaryRole?.role_id,
                  role_name: primaryRole?.role?.name,
                };
              }
            } catch (err) {
              console.error("Error fetching user roles:", err);
            }
            return agent;
          })
        );
        setAgents(agentsWithRoles);
      }
      if (invitationsRes.ok) setInvitations(await invitationsRes.json());
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  };


  const handleSendInvitation = async () => {
    if (!inviteFormData.email) {
      setError("El correo electrónico es requerido");
      return;
    }

    if (!inviteFormData.role_id) {
      setError("Debes seleccionar un rol");
      return;
    }

    if (!inviteFormData.message.trim()) {
      setError("El mensaje es requerido");
      return;
    }

    if (!currentWorkspace) {
        setError("No hay un espacio de trabajo seleccionado");
        return;
    }

    setSendingInvitation(true);
    setError(null);

    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteFormData.email,
          role_id: inviteFormData.role_id,
          message: inviteFormData.message.trim(),
          workspace_id: currentWorkspace.id,
        }),
      });

      if (!response.ok) throw new Error("Failed to send invitation");

      await fetchData();
      setShowInviteModal(false);
      setInviteFormData({
        email: "",
        role_id: "",
        message: "",
      });
      setError(null);
    } catch (err: any) {
      console.error("Error sending invitation:", err);
      setError(err.message || "Error al enviar invitación");
    } finally {
      setSendingInvitation(false);
    }
  };

  const handleCopyLink = () => {
    if (invitationLink) {
      navigator.clipboard.writeText(invitationLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCloseInviteModal = () => {
    setShowInviteModal(false);
    setInvitationLink(null);
    setCopiedLink(false);
    setSendingInvitation(false);
    setInviteFormData({
      email: "",
      role_id: "",
      message: "",
    });
    setError(null);
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm("¿Estás seguro de eliminar este agente? Esta acción no se puede deshacer.")) return;

    if (!currentWorkspace) {
      setError("No hay un espacio de trabajo seleccionado");
      return;
    }

    try {
      const response = await fetch(`/api/agents?user_id=${agentId}&workspace_id=${currentWorkspace.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete agent");
      }

      await fetchData();
    } catch (err) {
      console.error("Error deleting agent:", err);
      setError("Error al eliminar agente");
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta invitación?")) return;

    try {
      const response = await fetch(`/api/invitations?id=${invitationId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete invitation");

      await fetchData();
    } catch (err) {
      console.error("Error deleting invitation:", err);
      setError("Error al eliminar invitación");
    }
  };

  const handleRoleChange = (agentId: string, agentName: string, roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    setRoleAssignmentConfirmation({
      agentId,
      agentName,
      roleId,
      roleName: role.name,
    });
  };

  const handleConfirmRoleAssignment = async () => {
    if (!roleAssignmentConfirmation || !currentWorkspace) return;

    setAssigningRole(true);
    setError(null);

    try {
      const response = await fetch("/api/user-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: roleAssignmentConfirmation.agentId,
          role_id: roleAssignmentConfirmation.roleId,
          workspace_id: currentWorkspace.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to assign role");
      }

      await fetchData();
      setRoleAssignmentConfirmation(null);
    } catch (err: any) {
      console.error("Error assigning role:", err);
      setError(err.message || "Error al asignar rol");
    } finally {
      setAssigningRole(false);
    }
  };

  const handleSaveAgentName = async () => {
    if (!editingAgentName || !currentWorkspace) return;

    // Optimistic update
    const previousAgents = [...agents];
    setAgents(agents.map(a => 
      a.user_id === editingAgentName.userId 
        ? { ...a, display_name: editingAgentName.currentName } 
        : a
    ));

    setSavingAgentName(true);
    try {
      const response = await fetch("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: editingAgentName.userId,
          display_name: editingAgentName.currentName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update agent name");
      }
      
      // Success - invite fetch to refresh (optional but good for consistency)
      await fetchData();
    } catch (err) {
      console.error("Error updating agent name:", err);
      setError("Error al actualizar el nombre del agente");
      // Revert optimistic update
      setAgents(previousAgents);
    } finally {
      setSavingAgentName(false);
      setEditingAgentName(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Gestión de Agentes y Roles</h2>
          <p className="text-sm text-text-secondary mt-1">
            Crea agentes, asigna roles y gestiona permisos
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Roles Section - FIRST */}
      <RolesManagement onRoleUpdated={fetchData} />

      {/* Invitations Section - FIRST */}
      {invitations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <HiMail className="w-6 h-6 text-yellow-600" />
                Invitaciones Pendientes
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                Invitaciones enviadas esperando respuesta
              </p>
            </div>
            <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-full text-sm font-medium">
              {invitations.length} pendiente{invitations.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg shrink-0">
                      <HiMail className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-foreground truncate">
                        {invitation.email}
                      </h4>
                      <p className="text-xs text-text-secondary mt-1">
                        Invitado por {invitation.inviter_name || invitation.inviter_email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteInvitation(invitation.id)}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors shrink-0"
                    title="Cancelar invitación"
                  >
                    <HiTrash className="w-4 h-4 text-red-600" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Rol:</span>
                    <span className="font-medium text-foreground">
                      {invitation.role_name}
                    </span>
                  </div>
                  {invitation.message && (
                    <div>
                      <span className="text-text-secondary">Mensaje:</span>
                      <p className="text-xs text-foreground mt-1 bg-hover-bg p-2 rounded">
                        {invitation.message}
                      </p>
                    </div>
                  )}
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agents Section - SECOND */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <HiUserCircle className="w-6 h-6 text-primary" />
              Agentes
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Crea y gestiona los agentes del sistema
            </p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/25"
          >
            <HiMail className="w-5 h-5" />
            Invitar Agente
          </button>
        </div>

        {agents.length === 0 ? (
          <div className="text-center py-12 bg-background-bg border border-current/20 rounded-lg">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <HiUserCircle className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              No hay agentes creados
            </h3>
            <p className="text-text-secondary mb-6 max-w-md mx-auto">
              Crea tu primer agente para comenzar a asignar conversaciones
            </p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/25"
            >
              <HiMail className="w-5 h-5" />
              Invitar Primer Agente
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-background-bg border border-current/20 rounded-lg p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold shrink-0">
                      {agent.display_name?.charAt(0)?.toUpperCase() || "A"}
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* Editable Name */}
                      <div className="flex items-center gap-2">
                        {editingAgentName?.userId === agent.user_id ? (
                          <div className="flex items-center gap-1 w-full">
                            <input 
                              type="text"
                              value={editingAgentName.currentName}
                              onChange={(e) => setEditingAgentName({ ...editingAgentName, currentName: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveAgentName();
                                if (e.key === 'Escape') setEditingAgentName(null);
                              }}
                              autoFocus
                              className="w-full px-2 py-0.5 text-sm bg-input-bg border border-primary rounded focus:outline-none"
                            />
                            <button
                               onClick={handleSaveAgentName}
                               className="p-1 hover:bg-green-100 text-green-600 rounded"
                            >
                              <HiCheck className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <h4 className="font-medium text-foreground truncate" title={agent.display_name || "Agente"}>
                              {agent.display_name || "Agente"}
                            </h4>
                            <button 
                              onClick={() => setEditingAgentName({ userId: agent.user_id, currentName: agent.display_name || "" })}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-hover-bg rounded transition-opacity"
                              title="Editar nombre"
                            >
                              <HiPencil className="w-3 h-3 text-text-secondary" />
                            </button>
                          </div>
                        )}
                      </div>

                      {agent.email && (
                        <p className="text-xs text-text-secondary truncate">
                          {agent.email}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            agent.status === "available"
                              ? "bg-green-500"
                              : agent.status === "busy"
                              ? "bg-yellow-500"
                              : "bg-gray-400"
                          }`}
                        />
                        <span className="text-xs text-text-secondary">
                          {agent.status === "available"
                            ? "Disponible"
                            : agent.status === "busy"
                            ? "Ocupado"
                            : "Desconectado"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteAgent(agent.user_id)}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors shrink-0"
                    title="Eliminar agente"
                  >
                    <HiTrash className="w-4 h-4 text-red-600" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Role Selector */}
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary flex items-center gap-1">
                      <HiShieldCheck className="w-3 h-3" />
                      Rol:
                    </span>
                    <select
                      value={agent.role_id || ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleRoleChange(
                            agent.user_id,
                            agent.display_name || "Agente",
                            e.target.value
                          );
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-1 text-xs border border-current/20 rounded bg-input-bg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Sin rol</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Chats activos:</span>
                    <span className="font-medium text-foreground">
                      {agent.current_chat_count} / {agent.max_concurrent_chats}
                    </span>
                  </div>
                  {agent.specialties && agent.specialties.length > 0 && (
                    <div>
                      <span className="text-text-secondary">Especialidades:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {agent.specialties.map((specialty, idx) => (
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
                  {agent.languages && agent.languages.length > 0 && (
                    <div>
                      <span className="text-text-secondary">Idiomas:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {agent.languages.map((lang, idx) => (
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
              </div>
            ))}
          </div>
        )}
      </div>



      {/* Invite Agent Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            {!invitationLink ? (
              <>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Invitar Nuevo Agente
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      value={inviteFormData.email}
                      onChange={(e) =>
                        setInviteFormData({ ...inviteFormData, email: e.target.value })
                      }
                      disabled={sendingInvitation}
                      className="w-full px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="agente@ejemplo.com"
                    />
                    <p className="text-xs text-text-secondary mt-1">
                      Se enviará una invitación a este correo
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Rol *
                    </label>
                    <select
                      value={inviteFormData.role_id}
                      onChange={(e) =>
                        setInviteFormData({ ...inviteFormData, role_id: e.target.value })
                      }
                      disabled={sendingInvitation}
                      className="w-full px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Selecciona un rol --</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Mensaje de Invitación *
                    </label>
                    <textarea
                      value={inviteFormData.message}
                      onChange={(e) =>
                        setInviteFormData({ ...inviteFormData, message: e.target.value })
                      }
                      disabled={sendingInvitation}
                      className="w-full px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                      rows={4}
                      placeholder="Escribe un mensaje personalizado para la invitación..."
                    />
                    <p className="text-xs text-text-secondary mt-1">
                      Este mensaje se incluirá en la invitación por email
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      El agente recibirá el rol seleccionado cuando acepte la invitación.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleCloseInviteModal}
                    disabled={sendingInvitation}
                    className="flex-1 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-hover-bg rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSendInvitation}
                    disabled={sendingInvitation}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingInvitation ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <HiMail className="w-4 h-4" />
                        Enviar Invitación
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
                    <HiCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    ¡Invitación Creada!
                  </h3>
                  <p className="text-sm text-text-secondary mb-4">
                    Comparte este enlace con el nuevo agente
                  </p>
                </div>
                <div className="bg-hover-bg rounded-lg p-4 mb-4">
                  <p className="text-xs text-text-secondary mb-2">Enlace de invitación:</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={invitationLink}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm border border-current/20 rounded-lg bg-input-bg text-foreground"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                      title="Copiar enlace"
                    >
                      {copiedLink ? (
                        <HiCheck className="w-5 h-5 text-green-600" />
                      ) : (
                        <HiClipboard className="w-5 h-5 text-primary" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleCloseInviteModal}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                >
                  Cerrar
                </button>
              </>
            )}
            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Role Assignment Confirmation Modal */}
      {roleAssignmentConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <HiShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Confirmar Asignación de Rol
              </h3>
              <p className="text-sm text-text-secondary">
                ¿Estás seguro de asignar el rol <span className="font-semibold text-foreground">{roleAssignmentConfirmation.roleName}</span> al agente <span className="font-semibold text-foreground">{roleAssignmentConfirmation.agentName}</span>?
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                Esta acción cambiará los permisos del agente. Asegúrate de que el rol seleccionado sea el correcto.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRoleAssignmentConfirmation(null)}
                disabled={assigningRole}
                className="flex-1 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-hover-bg rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRoleAssignment}
                disabled={assigningRole}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {assigningRole ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Asignando...
                  </>
                ) : (
                  <>
                    <HiCheck className="w-4 h-4" />
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}