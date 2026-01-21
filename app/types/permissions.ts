// =====================================================
// PERMISSION SYSTEM TYPES
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
// COMPOSITE TYPES FOR UI
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
  groups: RolePermissionGroupWithDetails[];
}
