import { createClient, createServiceClient } from "@/app/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient(cookies());
    const serviceSupabase = createServiceClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // No admin validation needed - any authenticated user can configure roles

    const body = await request.json();
    const { role_id, group_id, is_active } = body;

    if (!role_id || !group_id || is_active === undefined) {
      return NextResponse.json(
        { error: "role_id, group_id, and is_active are required" },
        { status: 400 }
      );
    }

    // Validate that the role exists
    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("id", role_id)
      .single();

    if (roleError || !role) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      );
    }

    // Validate that the group exists
    const { data: group, error: groupError } = await supabase
      .from("permission_groups")
      .select("id")
      .eq("id", group_id)
      .single();

    if (groupError || !group) {
      return NextResponse.json(
        { error: "Permission group not found" },
        { status: 404 }
      );
    }

    // Upsert the role permission group using service client to bypass RLS
    const { data, error } = await serviceSupabase
      .from("role_permission_groups")
      .upsert(
        {
          role_id,
          group_id,
          is_active,
        },
        {
          onConflict: "role_id,group_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error upserting role permission group:", error);
      return NextResponse.json(
        { error: "Failed to update role permission group", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in POST /api/roles/permissions/groups:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient(cookies());

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role_id, roles(slug)")
      .eq("user_id", user.id);

    const isAdmin = userRoles?.some(
      (ur: any) =>
        ur.roles?.slug === "admin" || ur.roles?.slug === "super_admin"
    );

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get("role_id");
    const groupId = searchParams.get("group_id");

    if (!roleId || !groupId) {
      return NextResponse.json(
        { error: "role_id and group_id are required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("role_permission_groups")
      .delete()
      .eq("role_id", roleId)
      .eq("group_id", groupId);

    if (error) {
      console.error("Error deleting role permission group:", error);
      return NextResponse.json(
        { error: "Failed to delete role permission group" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/roles/permissions/groups:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
