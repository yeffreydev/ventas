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
    const userId = searchParams.get("user_id");

    let query = supabase
      .from("user_roles")
      .select(`
        *,
        role:roles(*)
      `);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: userRoles, error } = await query;

    if (error) {
      console.error("Error fetching user roles:", error);
      return NextResponse.json(
        { error: "Failed to fetch user roles" },
        { status: 500 }
      );
    }

    return NextResponse.json(userRoles);
  } catch (error) {
    console.error("Error in GET /api/user-roles:", error);
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
    const { user_id, role_id, workspace_id } = body;

    if (!user_id || !role_id) {
      return NextResponse.json(
        { error: "user_id and role_id are required" },
        { status: 400 }
      );
    }

    // First, delete any existing roles for this user in this workspace
    // This ensures a user only has one role per workspace
    if (workspace_id) {
      // Get roles that belong to this workspace
      const { data: workspaceRoles } = await supabase
        .from("roles")
        .select("id")
        .or(`workspace_id.eq.${workspace_id},workspace_id.is.null`);

      if (workspaceRoles && workspaceRoles.length > 0) {
        const roleIds = workspaceRoles.map(r => r.id);
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", user_id)
          .in("role_id", roleIds);
      }
    } else {
      // If no workspace_id, just delete all roles for this user
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user_id);
    }

    // Now insert the new role
    const { data: userRole, error } = await supabase
      .from("user_roles")
      .insert({
        user_id,
        role_id,
        assigned_by: user.id,
      })
      .select(`
        *,
        role:roles(*)
      `)
      .single();

    if (error) {
      console.error("Error assigning role:", error);
      return NextResponse.json(
        { error: "Failed to assign role" },
        { status: 500 }
      );
    }

    return NextResponse.json(userRole, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/user-roles:", error);
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error removing role:", error);
      return NextResponse.json(
        { error: "Failed to remove role" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/user-roles:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}