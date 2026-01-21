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
    const conversationId = searchParams.get("conversation_id");
    const agentId = searchParams.get("agent_id");
    const status = searchParams.get("status");

    let query = supabase
      .from("chat_assignments_detailed")
      .select("*");

    if (conversationId) {
      query = query.eq("conversation_id", conversationId);
    }
    if (agentId) {
      query = query.eq("agent_id", agentId);
    }
    if (status) {
      query = query.eq("status", status);
    }

    query = query.order("assigned_at", { ascending: false });

    const { data: assignments, error } = await query;

    if (error) {
      console.error("Error fetching chat assignments:", error);
      return NextResponse.json(
        { error: "Failed to fetch chat assignments" },
        { status: 500 }
      );
    }

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Error in GET /api/chat-assignments:", error);
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
    const { conversation_id, agent_id, team_id, notes } = body;

    if (!conversation_id || !agent_id) {
      return NextResponse.json(
        { error: "conversation_id and agent_id are required" },
        { status: 400 }
      );
    }

    // Use the database function to assign agent
    const { data, error } = await supabase.rpc("assign_agent_to_chat", {
      p_conversation_id: conversation_id,
      p_agent_id: agent_id,
      p_team_id: team_id || null,
      p_assigned_by: user.id,
    });

    if (error) {
      console.error("Error assigning agent to chat:", error);
      return NextResponse.json(
        { error: "Failed to assign agent to chat" },
        { status: 500 }
      );
    }

    // Get the created assignment
    const { data: assignment, error: fetchError } = await supabase
      .from("chat_assignments_detailed")
      .select("*")
      .eq("id", data)
      .single();

    if (fetchError) {
      console.error("Error fetching assignment:", fetchError);
      return NextResponse.json(
        { error: "Assignment created but failed to fetch details" },
        { status: 500 }
      );
    }

    // Update notes if provided
    if (notes) {
      await supabase
        .from("chat_assignments")
        .update({ notes })
        .eq("id", data);
    }

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/chat-assignments:", error);
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
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'completed' || status === 'transferred') {
        updateData.unassigned_at = new Date().toISOString();
      }
    }
    if (notes !== undefined) updateData.notes = notes;

    const { data: assignment, error } = await supabase
      .from("chat_assignments")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating chat assignment:", error);
      return NextResponse.json(
        { error: "Failed to update chat assignment" },
        { status: 500 }
      );
    }

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Error in PATCH /api/chat-assignments:", error);
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
    const conversationId = searchParams.get("conversation_id");
    const agentId = searchParams.get("agent_id");

    if (!conversationId || !agentId) {
      return NextResponse.json(
        { error: "conversation_id and agent_id are required" },
        { status: 400 }
      );
    }

    // Use the database function to unassign agent
    const { data, error } = await supabase.rpc("unassign_agent_from_chat", {
      p_conversation_id: parseInt(conversationId),
      p_agent_id: agentId,
    });

    if (error) {
      console.error("Error unassigning agent from chat:", error);
      return NextResponse.json(
        { error: "Failed to unassign agent from chat" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: data });
  } catch (error) {
    console.error("Error in DELETE /api/chat-assignments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}