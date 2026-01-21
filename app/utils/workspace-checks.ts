import { SupabaseClient } from '@supabase/supabase-js';

export async function checkWorkspaceAccess(supabase: SupabaseClient<any, "public", any> | any, workspaceId: string, userId: string): Promise<boolean> {
  if (!workspaceId) return false;
  const { data, error } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  return !error && !!data;
}
