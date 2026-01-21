"use client";

import { useState, useEffect } from "react";
import type { Role } from "@/app/types/roles-agents";
import RoleEditor from "./RoleEditor";
import { useWorkspace } from "@/app/providers/WorkspaceProvider";
import {
  HiShieldCheck,
  HiPencil,
  HiUserGroup,
  HiLockClosed,
  HiPlus,
  HiTrash,
} from "react-icons/hi";

interface RolesManagementProps {
  onRoleUpdated?: () => void;
}

export default function RolesManagement({
  onRoleUpdated,
}: RolesManagementProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { currentWorkspace } = useWorkspace();

  useEffect(() => {
    if (currentWorkspace) {
      fetchRoles();
    }
  }, [currentWorkspace]);

  const fetchRoles = async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/roles?workspace_id=${currentWorkspace.id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch roles");
      }

      const data = await response.json();
      // Filter out super_admin role (internal system role)
      const filteredRoles = data.filter((role: Role) =>
        role.slug !== 'super_admin'
      );
      setRoles(filteredRoles);
    } catch (err: any) {
      console.error("Error fetching roles:", err);
      setError(err.message || "Error al cargar roles");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleClick = (roleId: string) => {
    setSelectedRoleId(roleId);
  };

  const handleCloseEditor = () => {
    setSelectedRoleId(null);
  };

  const handleRoleUpdated = () => {
    fetchRoles();
    onRoleUpdated?.();
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  };

  const handleCreateRole = async () => {
    if (!formData.name.trim()) {
      setError("El nombre del rol es requerido");
      return;
    }

    if (!currentWorkspace) {
      setError("No hay un espacio de trabajo seleccionado");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const slug = generateSlug(formData.name);
      
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          slug,
          description: formData.description.trim() || null,
          workspace_id: currentWorkspace.id,
          permissions: {},
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create role");
      }

      await fetchRoles();
      setShowCreateModal(false);
      setFormData({ name: "", description: "" });
      onRoleUpdated?.();
    } catch (err: any) {
      console.error("Error creating role:", err);
      setError(err.message || "Error al crear rol");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string, isSystemRole: boolean) => {
    if (isSystemRole) {
      setError("No se puede eliminar un rol del sistema");
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar el rol "${roleName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeleting(roleId);
    setError(null);

    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete role");
      }

      await fetchRoles();
      onRoleUpdated?.();
    } catch (err: any) {
      console.error("Error deleting role:", err);
      setError(err.message || "Error al eliminar rol");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <HiShieldCheck className="w-6 h-6 text-primary" />
            Roles y Permisos
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Configura los permisos para cada rol del sistema
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/25"
        >
          <HiPlus className="w-5 h-5" />
          Crear Rol
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Roles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => {
          // Only admin role is protected (cannot be deleted)
          const isProtected = role.is_system_role || role.slug === 'admin';
          
          return (
            <div
              key={role.id}
              className="bg-background-bg border border-current/20 rounded-lg p-5 hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => handleRoleClick(role.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <HiUserGroup className="w-6 h-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {role.name}
                      {isProtected && (
                        <HiLockClosed className="w-4 h-4 text-gray-400" title="Rol protegido" />
                      )}
                    </h3>
                    {role.description && (
                      <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                        {role.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRoleClick(role.id);
                    }}
                    className="p-2 hover:bg-hover-bg rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Configurar permisos"
                  >
                    <HiPencil className="w-4 h-4 text-primary" />
                  </button>
                  {!isProtected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRole(role.id, role.name, role.is_system_role);
                      }}
                      disabled={deleting === role.id}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      title="Eliminar rol"
                    >
                      {deleting === role.id ? (
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <HiTrash className="w-4 h-4 text-red-600" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`
                  inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                  ${
                    role.slug === "admin" || role.slug === "super_admin"
                      ? "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400"
                      : role.slug === "agent"
                      ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                  }
                `}
                >
                  {role.slug}
                </span>
                {isProtected && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs font-medium">
                    Protegido
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Crear Nuevo Rol
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nombre del Rol *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Supervisor"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={3}
                  placeholder="Describe las responsabilidades de este rol..."
                />
              </div>
            </div>
            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({ name: "", description: "" });
                  setError(null);
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-hover-bg rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateRole}
                disabled={creating}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear Rol"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Editor Modal */}
      {selectedRoleId && (
        <RoleEditor
          roleId={selectedRoleId}
          onClose={handleCloseEditor}
          onSuccess={handleRoleUpdated}
        />
      )}
    </div>
  );
}
