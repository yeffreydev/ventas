"use client";

import { useState } from "react";
import type {
  PermissionGroup,
  RolePermissionSwitchWithDetails,
} from "@/app/types/permissions";
import PermissionSwitchItem from "./PermissionSwitchItem";
import { HiChevronDown, HiChevronRight } from "react-icons/hi";
import * as HeroIcons from "react-icons/hi";

interface PermissionGroupCardProps {
  group: PermissionGroup;
  isActive: boolean;
  switches: RolePermissionSwitchWithDetails[];
  roleId: string;
  onToggleGroup: (groupId: string, isActive: boolean) => Promise<void>;
  onToggleSwitch: (switchId: string, isActive: boolean) => Promise<void>;
  disabled?: boolean;
}

export default function PermissionGroupCard({
  group,
  isActive,
  switches,
  roleId,
  onToggleGroup,
  onToggleSwitch,
  disabled = false,
}: PermissionGroupCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const activeCount = switches.filter((s) => s.is_active).length;
  const totalCount = switches.length;

  const handleToggleGroup = async () => {
    if (disabled || loading) return;

    setLoading(true);
    try {
      await onToggleGroup(group.id, !isActive);
    } catch (error) {
      console.error("Error toggling group:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get the icon component dynamically
  const IconComponent = group.icon
    ? (HeroIcons as any)[group.icon] || HeroIcons.HiFolder
    : HeroIcons.HiFolder;

  return (
    <div className="border border-current/20 rounded-lg overflow-hidden bg-background">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Toggle Switch */}
          <button
            onClick={handleToggleGroup}
            disabled={disabled || loading}
            className={`
              relative flex-shrink-0 w-12 h-6 rounded-full transition-colors mt-1
              ${isActive ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}
              ${disabled || loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            <span
              className={`
                absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md
                transform transition-transform
                ${isActive ? "translate-x-6" : "translate-x-0"}
              `}
            >
              {loading && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></span>
                </span>
              )}
            </span>
          </button>

          {/* Group Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <IconComponent className="w-5 h-5 text-primary flex-shrink-0" />
              <h3 className="text-base font-semibold text-foreground">
                {group.name}
              </h3>
            </div>
            {group.description && (
              <p className="text-sm text-text-secondary mb-2">
                {group.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs">
              <span
                className={`
                px-2 py-1 rounded-full font-medium
                ${
                  isActive
                    ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                }
              `}
              >
                {isActive ? "Activo" : "Inactivo"}
              </span>
              <span className="text-text-secondary">
                {activeCount} / {totalCount} permisos activos
              </span>
            </div>
          </div>

          {/* Expand Button */}
          {isActive && switches.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 hover:bg-hover-bg rounded-lg transition-colors flex-shrink-0"
            >
              {expanded ? (
                <HiChevronDown className="w-5 h-5 text-foreground" />
              ) : (
                <HiChevronRight className="w-5 h-5 text-foreground" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Switches List */}
      {isActive && expanded && switches.length > 0 && (
        <div className="border-t border-current/20 p-4 bg-background-bg/50">
          <div className="space-y-2">
            {switches.map((switchWithDetails) => (
              <PermissionSwitchItem
                key={switchWithDetails.switch.id}
                switchData={switchWithDetails.switch}
                isActive={switchWithDetails.is_active}
                onToggle={onToggleSwitch}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
