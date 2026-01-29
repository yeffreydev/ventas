import { createClient } from "@/app/utils/supabase/server";
import { cookies } from "next/headers";
import type { Permission, Role } from "@/app/types/roles-agents";

// System modules - these are the only permissions now
export const SYSTEM_MODULES = [
  'dashboard',
  'chats',
  'assistant',
  'customers',
  'orders',
  'scheduled_messages',
  'products',
  'kanban',
  'payments',
  'integrations',
  'automation',
  'config'
] as const;

export type ModuleSlug = typeof SYSTEM_MODULES[number];

/**
 * Check if a user has access to a specific module in a workspace
 * Simplified: if module is active, user has FULL access (create, edit, delete, view)
 */
export async function hasPermission(
  userId: string,
  module: Permission,
  workspaceId?: string
): Promise<boolean> {
  try {
    const supabase = await createClient(cookies());

    // If no workspaceId provided, get user's current workspace
    if (!workspaceId) {
      const { data: workspace } = await supabase
        .from('user_accessible_workspaces')
        .select('id, is_owner')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (!workspace) return false;
      workspaceId = workspace.id;
      
      // If user is owner, they have all permissions
      if (workspace.is_owner) return true;
    }

    // Check if user is owner
    const { data: ownerCheck } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    if (ownerCheck && ownerCheck.owner_id === userId) {
      return true;
    }

    // Get user permissions using the simplified RPC function
    const { data: permissions, error } = await supabase.rpc("get_user_permissions", {
      p_user_id: userId,
      p_workspace_id: workspaceId,
    });

    if (error) {
      console.warn("RPC get_user_permissions error:", error);
      
      // Fallback: Check workspace_members
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single();

      if (member) {
        // Admins have all permissions
        if (member.role === 'admin') return true;
        
        // Agents have basic permissions by default
        const basicModules = ['dashboard', 'chats', 'customers'];
        return basicModules.includes(module);
      }
      
      return false;
    }

    // Check permissions - simplified logic
    if (permissions) {
      // If user has 'all' permission (owner/admin)
      if (permissions.all === true) return true;
      
      // Check if specific module is active
      return permissions[module] === true;
    }

    return false;
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}

/**
 * Get all roles for a user
 */
export async function getUserRoles(userId: string): Promise<Role[]> {
  try {
    const supabase = await createClient(cookies());

    const { data, error } = await supabase.rpc("get_user_roles", {
      user_uuid: userId,
    });

    if (error) {
      console.error("Error getting user roles:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getUserRoles:", error);
    return [];
  }
}

/**
 * Check if user has any of the specified roles
 */
export async function hasAnyRole(
  userId: string,
  roleSlugs: string[]
): Promise<boolean> {
  try {
    const roles = await getUserRoles(userId);
    return roles.some((role) => roleSlugs.includes(role.slug));
  } catch (error) {
    console.error("Error in hasAnyRole:", error);
    return false;
  }
}

/**
 * Check if user is an admin (super_admin or admin)
 */
export async function isAdmin(userId: string): Promise<boolean> {
  return hasAnyRole(userId, ["super_admin", "admin"]);
}

/**
 * Check if user is an agent
 */
export async function isAgent(userId: string): Promise<boolean> {
  return hasAnyRole(userId, ["agent"]);
}

/**
 * Check if user is a manager
 */
export async function isManager(userId: string): Promise<boolean> {
  return hasAnyRole(userId, ["manager"]);
}

/**
 * Get user's active modules based on their roles
 * Returns object with module slugs as keys and true/false as values
 */
export async function getUserPermissions(
  userId: string,
  workspaceId?: string
): Promise<Record<string, boolean>> {
  try {
    const supabase = await createClient(cookies());

    // Get workspace if not provided
    if (!workspaceId) {
      const { data: workspace } = await supabase
        .from('user_accessible_workspaces')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (!workspace) return {};
      workspaceId = workspace.id;
    }

    const { data: permissions, error } = await supabase.rpc("get_user_permissions", {
      p_user_id: userId,
      p_workspace_id: workspaceId,
    });

    if (error) {
      console.error("Error getting user permissions:", error);
      return {};
    }

    return permissions || {};
  } catch (error) {
    console.error("Error in getUserPermissions:", error);
    return {};
  }
}

/**
 * Check if user can access a specific module
 * Simplified: just checks if module is active for the user
 */
export async function canAccessModule(
  userId: string,
  module: string,
  workspaceId?: string
): Promise<boolean> {
  try {
    const permissions = await getUserPermissions(userId, workspaceId);

    // Check if user has 'all' permission (owner/super admin)
    if (permissions.all === true) {
      return true;
    }

    // Check if user has specific module active
    return permissions[module] === true;
  } catch (error) {
    console.error("Error in canAccessModule:", error);
    return false;
  }
}

/**
 * Filter navigation items based on user's active modules
 */
export async function filterNavigationByPermissions(
  userId: string,
  navigationItems: Array<{ name: string; permission?: Permission }>,
  workspaceId?: string
): Promise<Array<{ name: string; permission?: Permission }>> {
  try {
    const permissions = await getUserPermissions(userId, workspaceId);

    // If user has all permissions, return all items
    if (permissions.all === true) {
      return navigationItems;
    }

    // Filter items based on active modules
    return navigationItems.filter((item) => {
      if (!item.permission) {
        // No permission required, include it
        return true;
      }
      // Check if module is active
      return permissions[item.permission] === true;
    });
  } catch (error) {
    console.error("Error in filterNavigationByPermissions:", error);
    return [];
  }
}

/**
 * Require specific module access (throws error if not authorized)
 */
export async function requirePermission(
  userId: string,
  module: Permission,
  workspaceId?: string
): Promise<void> {
  const hasAccess = await hasPermission(userId, module, workspaceId);

  if (!hasAccess) {
    throw new Error(`Unauthorized: No access to module '${module}'`);
  }
}

/**
 * Require any of the specified roles (throws error if not authorized)
 */
export async function requireAnyRole(
  userId: string,
  roleSlugs: string[]
): Promise<void> {
  const hasRole = await hasAnyRole(userId, roleSlugs);

  if (!hasRole) {
    throw new Error(
      `Unauthorized: User must have one of these roles: ${roleSlugs.join(", ")}`
    );
  }
}

/**
 * Require admin access (throws error if not authorized)
 */
export async function requireAdmin(userId: string): Promise<void> {
  const adminAccess = await isAdmin(userId);

  if (!adminAccess) {
    throw new Error("Unauthorized: Admin access required");
  }
}

/**
 * Get agent profile for a user
 */
export async function getAgentProfile(userId: string) {
  try {
    const supabase = await createClient(cookies());

    const { data, error } = await supabase
      .from("agent_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error getting agent profile:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getAgentProfile:", error);
    return null;
  }
}

/**
 * Check if user can access a specific chat (based on assignment)
 */
export async function canAccessChat(
  userId: string,
  conversationId: number
): Promise<boolean> {
  try {
    // Admins and managers can access all chats
    if (await isAdmin(userId)) {
      return true;
    }
    if (await isManager(userId)) {
      return true;
    }

    // Check if agent is assigned to this chat
    const supabase = await createClient(cookies());

    const { data, error } = await supabase
      .from("chat_assignments")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("agent_id", userId)
      .eq("status", "active")
      .is("unassigned_at", null)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" error
      console.error("Error checking chat access:", error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("Error in canAccessChat:", error);
    return false;
  }
}

/**
 * Get list of active modules for a user
 */
export async function getActiveModules(
  userId: string,
  workspaceId?: string
): Promise<string[]> {
  try {
    const permissions = await getUserPermissions(userId, workspaceId);

    if (permissions.all === true) {
      return [...SYSTEM_MODULES];
    }

    return Object.entries(permissions)
      .filter(([key, value]) => key !== 'all' && value === true)
      .map(([key]) => key);
  } catch (error) {
    console.error("Error in getActiveModules:", error);
    return [];
  }
}