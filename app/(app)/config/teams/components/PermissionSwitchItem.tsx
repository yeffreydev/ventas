"use client";

import { useState } from "react";
import type { PermissionSwitch } from "@/app/types/permissions";
import { HiCheck, HiX } from "react-icons/hi";

interface PermissionSwitchItemProps {
  switchData: PermissionSwitch;
  isActive: boolean;
  onToggle: (switchId: string, isActive: boolean) => Promise<void>;
  disabled?: boolean;
}

export default function PermissionSwitchItem({
  switchData,
  isActive,
  onToggle,
  disabled = false,
}: PermissionSwitchItemProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (disabled || loading) return;

    setLoading(true);
    try {
      await onToggle(switchData.id, !isActive);
    } catch (error) {
      console.error("Error toggling switch:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-background-bg hover:bg-hover-bg rounded-lg transition-colors">
      <button
        onClick={handleToggle}
        disabled={disabled || loading}
        className={`
          relative flex-shrink-0 w-11 h-6 rounded-full transition-colors
          ${isActive ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}
          ${disabled || loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md
            transform transition-transform
            ${isActive ? "translate-x-5" : "translate-x-0"}
          `}
        >
          {loading && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></span>
            </span>
          )}
        </span>
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-foreground">
            {switchData.name}
          </h4>
          {isActive ? (
            <HiCheck className="w-4 h-4 text-green-600" />
          ) : (
            <HiX className="w-4 h-4 text-gray-400" />
          )}
        </div>
        {switchData.description && (
          <p className="text-xs text-text-secondary mt-0.5">
            {switchData.description}
          </p>
        )}
      </div>
    </div>
  );
}
