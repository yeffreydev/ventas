import { createClient } from "@/app/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient(cookies());
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const activeOnly = searchParams.get("active_only") === "true";
    const workspaceId = searchParams.get("workspace_id");

    // If workspace_id is provided, filter agents by workspace
    if (workspaceId) {
      const { data: workspaceAgents, error } = await supabase
        .from("workspace_agents")
        .select(`
          agent_id,
          workspace_id,
          agent_profiles!inner(*)
        `)
        .eq("workspace_id", workspaceId);

      if (error) {
        console.error("Error fetching workspace agents:", error);
        return NextResponse.json(
          { error: "Failed to fetch agents" },
          { status: 500 }
        );
      }

      // Extract agent profiles from the join
      const agents = workspaceAgents.map(wa => wa.agent_profiles).filter(Boolean);
      return NextResponse.json(agents);
    }

    // Fallback: fetch all agents (for backwards compatibility)
    let query = supabase
      .from(activeOnly ? "active_agents" : "agent_profiles")
      .select("*");

    if (status && !activeOnly) {
      query = query.eq("status", status);
    }

    const { data: agents, error } = await query;

    if (error) {
      console.error("Error fetching agents:", error);
      return NextResponse.json(
        { error: "Failed to fetch agents" },
        { status: 500 }
      );
    }

    return NextResponse.json(agents);
  } catch (error) {
    console.error("Error in GET /api/agents:", error);
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
    const {
      user_id,
      display_name,
      avatar_url,
      status,
      max_concurrent_chats,
      specialties,
      languages,
      working_hours,
      metadata,
    } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    const { data: profile, error } = await supabase
      .from("agent_profiles")
      .insert({
        user_id,
        display_name,
        avatar_url,
        status: status || 'available',
        max_concurrent_chats: max_concurrent_chats || 5,
        specialties: specialties || [],
        languages: languages || ['es'],
        working_hours: working_hours || {},
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating agent profile:", error);
      return NextResponse.json(
        { error: "Failed to create agent profile" },
        { status: 500 }
      );
    }

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/agents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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
    const {
      user_id,
      display_name,
      avatar_url,
      status,
      max_concurrent_chats,
      specialties,
      languages,
      working_hours,
      metadata,
    } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (display_name !== undefined) updateData.display_name = display_name;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (status !== undefined) updateData.status = status;
    if (max_concurrent_chats !== undefined) updateData.max_concurrent_chats = max_concurrent_chats;
    if (specialties !== undefined) updateData.specialties = specialties;
    if (languages !== undefined) updateData.languages = languages;
    if (working_hours !== undefined) updateData.working_hours = working_hours;
    if (metadata !== undefined) updateData.metadata = metadata;

    const { data: profile, error } = await supabase
      .from("agent_profiles")
      .update(updateData)
      .eq("user_id", user_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating agent profile:", error);
      return NextResponse.json(
        { error: "Failed to update agent profile" },
        { status: 500 }
      );
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error in PATCH /api/agents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient(cookies());
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("user_id");
    const workspaceId = searchParams.get("workspace_id");

    if (!agentId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    // Use RPC function with SECURITY DEFINER to bypass RLS
    const { data, error } = await supabase.rpc('delete_agent', {
      p_agent_id: agentId,
      p_workspace_id: workspaceId || null
    });

    if (error) {
      console.error("Error deleting agent:", error);
      return NextResponse.json(
        { error: "Failed to delete agent" },
        { status: 500 }
      );
    }

    if (!data.success) {
      return NextResponse.json(
        { error: data.error || "Failed to delete agent" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in DELETE /api/agents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}