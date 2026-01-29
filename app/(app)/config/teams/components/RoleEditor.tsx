"use client";

import { useState, useEffect } from "react";
import type { RoleWithModules, RoleModuleWithDetails } from "@/app/types/permissions";
import { HiX, HiSparkles } from "react-icons/hi";
import * as HeroIcons from "react-icons/hi";

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
  const [roleData, setRoleData] = useState<RoleWithModules | null>(null);
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

  const handleToggleModule = async (moduleSlug: string, isActive: boolean) => {
    // Optimistic update - update UI immediately
    setRoleData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        modules: prev.modules.map(m =>
          m.module.slug === moduleSlug ? { ...m, is_active: isActive } : m
        )
      };
    });

    try {
      const response = await fetch("/api/roles/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_id: roleId,
          module_slug: moduleSlug,
          is_active: isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || "Failed to toggle module");
      }
      
      onSuccess?.();
    } catch (err: any) {
      console.error("Error toggling module:", err);
      // Revert on error
      setRoleData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          modules: prev.modules.map(m =>
            m.module.slug === moduleSlug ? { ...m, is_active: !isActive } : m
          )
        };
      });
      setError(err.message || "Error al actualizar módulo");
    }
  };

  const handleToggleAll = async (activate: boolean) => {
    if (!roleData) return;

    // Optimistic update
    setRoleData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        modules: prev.modules.map(m => ({ ...m, is_active: activate }))
      };
    });

    // Update all modules
    try {
      await Promise.all(
        roleData.modules.map(m =>
          fetch("/api/roles/permissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role_id: roleId,
              module_slug: m.module.slug,
              is_active: activate,
            }),
          })
        )
      );
      onSuccess?.();
    } catch (err: any) {
      console.error("Error toggling all modules:", err);
      setError(err.message || "Error al actualizar módulos");
      // Revert
      fetchRolePermissions();
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

  const activeCount = roleData.modules.filter(m => m.is_active).length;
  const totalCount = roleData.modules.length;
  const isAdminRole = roleData.role.slug === 'admin' || roleData.role.slug === 'super_admin';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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
              <div className="flex items-center gap-3 mt-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isAdminRole 
                    ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
                    : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                }`}>
                  {roleData.role.slug}
                </span>
                <span className="text-sm text-text-secondary">
                  {activeCount} / {totalCount} módulos activos
                </span>
              </div>
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

        {/* Quick Actions */}
        <div className="px-6 pt-4 flex gap-2">
          <button
            onClick={() => handleToggleAll(true)}
            className="px-4 py-2 text-sm font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors"
          >
            Activar todos
          </button>
          <button
            onClick={() => handleToggleAll(false)}
            className="px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Desactivar todos
          </button>
        </div>

        {/* Content - Module List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Módulos del Sistema
            </h3>
            <p className="text-sm text-text-secondary">
              Activa o desactiva los módulos para este rol. Si un módulo está activo, el usuario tiene acceso completo a todas sus funciones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {roleData.modules.map((moduleItem) => (
              <ModuleCard
                key={moduleItem.module.slug}
                module={moduleItem}
                onToggle={handleToggleModule}
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

// Module Card Component
interface ModuleCardProps {
  module: RoleModuleWithDetails;
  onToggle: (moduleSlug: string, isActive: boolean) => Promise<void>;
}

function ModuleCard({ module, onToggle }: ModuleCardProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onToggle(module.module.slug, !module.is_active);
    } finally {
      setLoading(false);
    }
  };

  // Get the icon component dynamically
  const IconComponent = module.module.icon
    ? (HeroIcons as any)[module.module.icon] || HiSparkles
    : HiSparkles;

  return (
    <div 
      className={`
        p-4 rounded-lg border transition-all cursor-pointer
        ${module.is_active 
          ? 'border-primary/50 bg-primary/5' 
          : 'border-current/20 bg-background hover:bg-hover-bg'
        }
      `}
      onClick={handleToggle}
    >
      <div className="flex items-center gap-3">
        {/* Toggle Switch */}
        <button
          className={`
            relative flex-shrink-0 w-12 h-6 rounded-full transition-colors
            ${module.is_active ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}
            ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          disabled={loading}
        >
          <span
            className={`
              absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md
              transform transition-transform
              ${module.is_active ? "translate-x-6" : "translate-x-0"}
            `}
          >
            {loading && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></span>
              </span>
            )}
          </span>
        </button>

        {/* Icon */}
        <div className={`p-2 rounded-lg flex-shrink-0 ${
          module.is_active 
            ? 'bg-primary/10' 
            : 'bg-gray-100 dark:bg-gray-800'
        }`}>
          <IconComponent className={`w-5 h-5 ${
            module.is_active 
              ? 'text-primary' 
              : 'text-gray-500 dark:text-gray-400'
          }`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium ${
            module.is_active 
              ? 'text-foreground' 
              : 'text-text-secondary'
          }`}>
            {module.module.name}
          </h4>
          <p className="text-xs text-text-secondary truncate">
            {module.module.description}
          </p>
        </div>
      </div>
    </div>
  );
}
