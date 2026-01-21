import { createClient } from "@/app/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createNotification } from "@/app/lib/notifications";

export async function POST(request: Request) {
  try {
    const supabase = await createClient(cookies());
    
    // 1. Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Find pending invitations for this user's email
    // Note: 'agent_invitations' has RLS policy "Users can view their own invitations" (email match)
    const { data: invitations, error: fetchError } = await supabase
      .from("agent_invitations")
      .select(`
        id,
        email,
        workspace_id,
        invited_by,
        token,
        created_at
      `)
      .eq("email", user.email)
      .eq("status", "pending");

    if (fetchError) {
      console.error("Error fetching pending invitations:", fetchError);
      return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 });
    }

    if (!invitations || invitations.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // 3. For each invitation, check if we already notified this user
    // We can check the 'notifications' table for metadata->>invitation_id
    let createdCount = 0;

    for (const invite of invitations) {
      // Check if notification exists - use proper JSONB query
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "invitation")
        .filter("metadata->invitation_id", "eq", invite.id)
        .maybeSingle();

      if (!existingNotif) {
        // Create notification
        // We need workspace name to make it pretty
        
        let workspaceName = "un espacio de trabajo";
        if (invite.workspace_id) {
           const { data: workspace } = await supabase
             .from("workspaces")
             .select("name")
             .eq("id", invite.workspace_id)
             .single();
           if (workspace) workspaceName = workspace.name;
        }

        await createNotification({
          user_id: user.id,
          type: "invitation",
          title: `Invitación a ${workspaceName}`,
          message: `Tienes una invitación pendiente para unirte a ${workspaceName}. Haz clic para ver los detalles y aceptar.`,
          priority: "high",
          action_url: `/accept-invitation?token=${invite.token}`,
          metadata: {
            invitation_id: invite.id,
            invitation_token: invite.token,
            workspace_id: invite.workspace_id,
            workspace_name: workspaceName
          }
        });
        createdCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: createdCount, 
      message: `Synced ${createdCount} invitation notifications` 
    });

  } catch (error) {
    console.error("Error in sync-notifications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
