import { createClient } from "@/app/utils/supabase/server";
import { cookies } from "next/headers";
import type { Permission, Role } from "@/app/types/roles-agents";

/**
 * Check if a user has a specific permission
 */
export async function hasPermission(
  userId: string,
  permission: Permission
): Promise<boolean> {
  try {
    const supabase = await createClient(cookies());

    const { data, error } = await supabase.rpc("user_has_permission", {
      user_uuid: userId,
      permission_key: permission,
    });

    if (error) {
      console.error("Error checking permission:", error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error("Error in hasPermission:", error);
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
 * Get user permissions based on their roles
 */
export async function getUserPermissions(
  userId: string
): Promise<Record<string, any>> {
  try {
    const roles = await getUserRoles(userId);

    // Merge all permissions from all roles
    const mergedPermissions: Record<string, any> = {};

    for (const role of roles) {
      if (role.permissions) {
        Object.assign(mergedPermissions, role.permissions);
      }
    }

    return mergedPermissions;
  } catch (error) {
    console.error("Error in getUserPermissions:", error);
    return {};
  }
}

/**
 * Check if user can access a specific module
 */
export async function canAccessModule(
  userId: string,
  module: string
): Promise<boolean> {
  try {
    const permissions = await getUserPermissions(userId);

    // Check if user has 'all' permission (super admin)
    if (permissions.all === true) {
      return true;
    }

    // Check if user has specific module permission
    return permissions[module] === true || permissions[module]?.view === true;
  } catch (error) {
    console.error("Error in canAccessModule:", error);
    return false;
  }
}

/**
 * Filter navigation items based on user permissions
 */
export async function filterNavigationByPermissions(
  userId: string,
  navigationItems: Array<{ name: string; permission?: Permission }>
): Promise<Array<{ name: string; permission?: Permission }>> {
  try {
    const permissions = await getUserPermissions(userId);

    // If user has all permissions, return all items
    if (permissions.all === true) {
      return navigationItems;
    }

    // Filter items based on permissions
    const filteredItems = [];
    for (const item of navigationItems) {
      if (!item.permission) {
        // No permission required, include it
        filteredItems.push(item);
      } else if (
        permissions[item.permission] === true ||
        permissions[item.permission]?.view === true
      ) {
        // User has permission for this item
        filteredItems.push(item);
      }
    }

    return filteredItems;
  } catch (error) {
    console.error("Error in filterNavigationByPermissions:", error);
    return [];
  }
}

/**
 * Require specific permission (throws error if not authorized)
 */
export async function requirePermission(
  userId: string,
  permission: Permission
): Promise<void> {
  const hasAccess = await hasPermission(userId, permission);

  if (!hasAccess) {
    throw new Error(`Unauthorized: Missing permission '${permission}'`);
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