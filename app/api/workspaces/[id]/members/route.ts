import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkWorkspaceAccess } from '@/app/lib/workspace-access';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check workspace access
    const hasAccess = await checkWorkspaceAccess(supabase, workspaceId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    // 1. Get workspace members (admins/owners from workspace_members)
    const { data: members, error: membersError } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    // 2. Get workspace agents (invited agents)
    const { data: agents, error: agentsError } = await supabase
      .from('workspace_agents')
      .select('agent_id')
      .eq('workspace_id', workspaceId);

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return NextResponse.json({ error: agentsError.message }, { status: 500 });
    }

    // Combine all user IDs
    const memberIds = members?.map(m => m.user_id) || [];
    const agentIds = agents?.map(a => a.agent_id) || [];
    
    // Also include the workspace owner if not in members
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();
      
    if (workspace?.owner_id) {
       if (!memberIds.includes(workspace.owner_id)) {
         memberIds.push(workspace.owner_id);
       }
    }

    const allUserIds = Array.from(new Set([...memberIds, ...agentIds]));

    if (allUserIds.length === 0) {
      return NextResponse.json([]);
    }

    // 3. Get profiles for names
    const { data: profiles, error: profilesError } = await supabase
      .from('agent_profiles')
      .select('user_id, display_name, status')
      .in('user_id', allUserIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
       // Check if error is because table doesn't exist or RLS. 
       // If profiles fail, we might return just IDs, but frontend needs names.
       // Let's return what we have.
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Map results
    const result = allUserIds.map(userId => {
      const profile = profiles?.find(p => p.user_id === userId);
      const member = members?.find(m => m.user_id === userId);
      const isOwner = workspace?.owner_id === userId;
      
      let role = 'agent';
      if (isOwner) role = 'owner';
      else if (member) role = member.role;

      return {
        id: userId,
        name: profile?.display_name || 'Usuario',
        email: null, // Profile doesn't have email usually, preventing leak unless we join auth.users (not possible via client query usually)
        role,
        status: profile?.status || 'unknown'
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
