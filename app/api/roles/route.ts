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
    const workspaceId = searchParams.get("workspace_id");

    let query = supabase
      .from("roles")
      .select("*")
      .order("name");

    // If workspace_id is provided, get workspace-specific roles only
    // Don't include system roles (they should be used as templates, not shown directly)
    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    } else {
      // Only show system roles if no workspace is specified
      query = query.is("workspace_id", null);
    }

    const { data: roles, error } = await query;

    if (error) {
      console.error("Error fetching roles:", error);
      return NextResponse.json(
        { error: "Failed to fetch roles" },
        { status: 500 }
      );
    }

    return NextResponse.json(roles);
  } catch (error) {
    console.error("Error in GET /api/roles:", error);
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
    const { name, slug, description, permissions, workspace_id } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    if (!workspace_id) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 }
      );
    }

    const { data: role, error } = await supabase
      .from("roles")
      .insert({
        name,
        slug,
        description,
        permissions: permissions || {},
        is_system_role: false,
        workspace_id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating role:", error);
      return NextResponse.json(
        { error: "Failed to create role" },
        { status: 500 }
      );
    }

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/roles:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}