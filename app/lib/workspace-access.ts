import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Check if a user has access to a workspace.
 * Checks:
 * 1. If user is the workspace owner
 * 2. If user is a workspace member
 * 3. If user is a workspace agent
 */
export async function checkWorkspaceAccess(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<boolean> {
  if (!workspaceId || !userId) return false;

  // Check if user is the owner of the workspace
  const { data: ownerData } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('owner_id', userId)
    .single();

  if (ownerData) return true;

  // Check if user is a workspace member
  const { data: memberData } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (memberData) return true;

  // Check if user is a workspace agent
  const { data: agentData } = await supabase
    .from('workspace_agents')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('agent_id', userId)
    .single();

  if (agentData) return true;

  return false;
}

/**
 * Check if user has access to a specific module in a workspace.
 * Uses the new simplified module-based permission system.
 */
export async function checkModuleAccess(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  moduleSlug: string
): Promise<boolean> {
  if (!userId || !workspaceId || !moduleSlug) return false;

  // Get user permissions
  const { data: permissions, error } = await supabase.rpc('get_user_permissions', {
    p_user_id: userId,
    p_workspace_id: workspaceId,
  });

  if (error) {
    console.error('[checkModuleAccess] Error getting permissions:', error);
    // Fail open if there's a DB error but user has workspace access
    return await checkWorkspaceAccess(supabase, workspaceId, userId);
  }

  if (!permissions) return false;

  // If user has all permissions (owner/admin)
  if (permissions.all === true) return true;

  // Check specific module
  return permissions[moduleSlug] === true;
}
