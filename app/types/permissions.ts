// =====================================================
// PERMISSION SYSTEM TYPES (SIMPLIFIED)
// =====================================================

// System module definition
export interface SystemModule {
  slug: string;
  name: string;
  description: string;
  icon: string;
}

// Role module status (is the module active for this role?)
export interface RoleModule {
  id: string;
  role_id: string;
  module_slug: string;
  is_active: boolean;
  workspace_id: string | null;
  created_at: string;
  updated_at: string;
}

// Module with its status for a specific role
export interface RoleModuleWithDetails {
  module: SystemModule;
  is_active: boolean;
}

// Role with its modules
export interface RoleWithModules {
  role: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    is_system_role: boolean;
    workspace_id: string | null;
  };
  modules: RoleModuleWithDetails[];
}

// =====================================================
// LEGACY TYPES (kept for backwards compatibility)
// =====================================================

export interface PermissionGroup {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionSwitch {
  id: string;
  group_id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface RolePermissionGroup {
  id: string;
  role_id: string;
  group_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RolePermissionSwitch {
  id: string;
  role_id: string;
  switch_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// COMPOSITE TYPES FOR UI (Legacy - deprecated)
// =====================================================

export interface RolePermissionSwitchWithDetails {
  switch: PermissionSwitch;
  is_active: boolean;
}

export interface RolePermissionGroupWithDetails {
  group: PermissionGroup;
  is_active: boolean;
  switches: RolePermissionSwitchWithDetails[];
}

export interface RoleWithPermissions {
  role: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    is_system_role: boolean;
  };
  // New simplified structure
  modules?: RoleModuleWithDetails[];
  // Legacy structure (deprecated)
  groups?: RolePermissionGroupWithDetails[];
}
