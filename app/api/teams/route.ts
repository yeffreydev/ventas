import { createClient } from "@/app/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/permissions";

export async function GET(request: Request) {
  try {
    const supabase = await createClient(cookies());
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    if (!workspaceId) {
        return NextResponse.json(
            { error: "Workspace ID is required" },
            { status: 400 }
        );
    }

    // Check permission with workspaceId
    try {
      await requirePermission(user.id, 'teams', workspaceId);
    } catch (error) {
       console.error('[GET /api/teams] Permission denied:', error);
       return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { data: teams, error } = await supabase
      .from("teams_detailed")
      .select(`
        *,
        members:team_members(
          id,
          user_id,
          role,
          joined_at
        )
      `)
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching teams:", error);
      return NextResponse.json(
        { error: "Failed to fetch teams" },
        { status: 500 }
      );
    }

    // Transform the data to match expected format
    const formattedTeams = teams.map(team => ({
      ...team,
      owner: {
        email: team.owner_email,
        display_name: team.owner_display_name
      }
    }));

    return NextResponse.json(formattedTeams);
  } catch (error) {
    console.error("Error in GET /api/teams:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient(cookies());
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, metadata, workspace_id } = body;

    if (!name || !workspace_id) {
      return NextResponse.json(
        { error: "Name and Workspace ID are required" },
        { status: 400 }
      );
    }

    // Check permission with workspaceId
    try {
      await requirePermission(user.id, 'teams', workspace_id);
    } catch (error) {
      console.error('[POST /api/teams] Permission denied:', error);
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { data: team, error } = await supabase
      .from("teams")
      .insert({
        name,
        description,
        workspace_id,
        owner_id: user.id,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating team:", error);
      return NextResponse.json(
        { error: "Failed to create team" },
        { status: 500 }
      );
    }

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/teams:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}