"use client";

import { useState, useEffect } from "react";
import type { RoleWithPermissions } from "@/app/types/permissions";
import PermissionGroupCard from "./PermissionGroupCard";
import { HiX } from "react-icons/hi";

interface RoleEditorProps {
  roleId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RoleEditor({
  roleId,
  onClose,
  onSuccess,
}: RoleEditorProps) {
  const [roleData, setRoleData] = useState<RoleWithPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRolePermissions();
  }, [roleId]);

  const fetchRolePermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/roles/permissions?role_id=${roleId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch role permissions");
      }

      const data = await response.json();
      setRoleData(data);
    } catch (err: any) {
      console.error("Error fetching role permissions:", err);
      setError(err.message || "Error al cargar permisos");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGroup = async (groupId: string, isActive: boolean) => {
    // Optimistic update - update UI immediately
    setRoleData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        groups: prev.groups.map(g => 
          g.group.id === groupId ? { ...g, is_active: isActive } : g
        )
      };
    });

    try {
      const response = await fetch("/api/roles/permissions/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_id: roleId,
          group_id: groupId,
          is_active: isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || "Failed to toggle group");
      }
      // No need to call onSuccess - optimistic update already handled UI
    } catch (err: any) {
      console.error("Error toggling group:", err);
      // Revert on error
      setRoleData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          groups: prev.groups.map(g => 
            g.group.id === groupId ? { ...g, is_active: !isActive } : g
          )
        };
      });
      setError(err.message || "Error al actualizar grupo");
    }
  };

  const handleToggleSwitch = async (switchId: string, isActive: boolean) => {
    // Optimistic update - update UI immediately
    setRoleData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        groups: prev.groups.map(g => ({
          ...g,
          switches: g.switches.map(s => 
            s.switch.id === switchId ? { ...s, is_active: isActive } : s
          )
        }))
      };
    });

    try {
      const response = await fetch("/api/roles/permissions/switches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_id: roleId,
          switch_id: switchId,
          is_active: isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || "Failed to toggle switch");
      }
      // No need to call onSuccess - optimistic update already handled UI
    } catch (err: any) {
      console.error("Error toggling switch:", err);
      // Revert on error
      setRoleData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          groups: prev.groups.map(g => ({
            ...g,
            switches: g.switches.map(s => 
              s.switch.id === switchId ? { ...s, is_active: !isActive } : s
            )
          }))
        };
      });
      setError(err.message || "Error al actualizar permiso");
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!roleData) {
    return null;
  }

  const isSystemRole = roleData.role.is_system_role;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-current/20">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {roleData.role.name}
              </h2>
              {roleData.role.description && (
                <p className="text-sm text-text-secondary mt-1">
                  {roleData.role.description}
                </p>
              )}
              {isSystemRole && (
                <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded">
                  Rol del Sistema
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
            >
              <HiX className="w-6 h-6 text-foreground" />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Grupos de Permisos
              </h3>
              <p className="text-sm text-text-secondary">
                Activa los grupos y configura los permisos específicos para
                este rol
              </p>
            </div>

            {roleData.groups.map((groupWithDetails) => (
              <PermissionGroupCard
                key={groupWithDetails.group.id}
                group={groupWithDetails.group}
                isActive={groupWithDetails.is_active}
                switches={groupWithDetails.switches}
                roleId={roleId}
                onToggleGroup={handleToggleGroup}
                onToggleSwitch={handleToggleSwitch}
                disabled={false}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-current/20 bg-background-bg">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
