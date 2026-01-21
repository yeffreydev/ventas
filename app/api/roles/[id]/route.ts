import { createClient } from "@/app/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(cookies());
    const { id } = await params;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: role, error } = await supabase
      .from("roles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching role:", error);
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error("Error in GET /api/roles/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(cookies());
    const { id } = await params;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, permissions } = body;

    // Check if role exists and is not a system role
    const { data: existingRole, error: fetchError } = await supabase
      .from("roles")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Prevent modifying system roles
    if (existingRole.is_system_role) {
      return NextResponse.json(
        { error: "Cannot modify system roles" },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (permissions !== undefined) updateData.permissions = permissions;

    const { data: role, error } = await supabase
      .from("roles")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating role:", error);
      return NextResponse.json(
        { error: "Failed to update role" },
        { status: 500 }
      );
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error("Error in PATCH /api/roles/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(cookies());
    const { id } = await params;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if role exists
    const { data: existingRole, error: fetchError } = await supabase
      .from("roles")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Prevent deleting system roles
    if (existingRole.is_system_role) {
      return NextResponse.json(
        { error: "No se puede eliminar un rol del sistema" },
        { status: 403 }
      );
    }

    // Prevent deleting admin role (protected)
    if (existingRole.slug === 'admin') {
      return NextResponse.json(
        { error: "No se puede eliminar el rol Admin" },
        { status: 403 }
      );
    }

    // Check if role is assigned to any users
    const { data: userRoles, error: userRolesError } = await supabase
      .from("user_roles")
      .select("id")
      .eq("role_id", id)
      .limit(1);

    if (userRolesError) {
      console.error("Error checking user roles:", userRolesError);
    }

    if (userRoles && userRoles.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar un rol que está asignado a usuarios" },
        { status: 400 }
      );
    }

    // Delete the role
    const { error } = await supabase
      .from("roles")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting role:", error);
      return NextResponse.json(
        { error: "Failed to delete role" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/roles/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
