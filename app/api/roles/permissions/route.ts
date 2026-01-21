import { createClient } from "@/app/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient(cookies());
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get("role_id");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!roleId) {
      return NextResponse.json(
        { error: "Role ID is required" },
        { status: 400 }
      );
    }

    // Fetch the role
    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id, name, slug, description, is_system_role, workspace_id")
      .eq("id", roleId)
      .single();

    if (roleError || !role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // No admin validation needed - any authenticated user can configure roles

    // Fetch all permission groups with their switches
    const { data: groups, error: groupsError } = await supabase
      .from("permission_groups")
      .select(
        `
        *,
        switches:permission_switches(*)
      `
      )
      .order("sort_order");

    if (groupsError) {
      console.error("Error fetching groups:", groupsError);
      return NextResponse.json(
        { error: "Failed to fetch permission groups" },
        { status: 500 }
      );
    }

    // Fetch role's active groups
    const { data: roleGroups, error: roleGroupsError } = await supabase
      .from("role_permission_groups")
      .select("group_id, is_active")
      .eq("role_id", roleId);

    if (roleGroupsError) {
      console.error("Error fetching role groups:", roleGroupsError);
    }

    // Fetch role's active switches
    const { data: roleSwitches, error: roleSwitchesError } = await supabase
      .from("role_permission_switches")
      .select("switch_id, is_active")
      .eq("role_id", roleId);

    if (roleSwitchesError) {
      console.error("Error fetching role switches:", roleSwitchesError);
    }

    // Create maps for quick lookup
    const roleGroupsMap = new Map(
      (roleGroups || []).map((rg) => [rg.group_id, rg.is_active])
    );
    const roleSwitchesMap = new Map(
      (roleSwitches || []).map((rs) => [rs.switch_id, rs.is_active])
    );

    // Build the response structure
    const groupsWithPermissions = (groups || []).map((group) => ({
      group: {
        id: group.id,
        name: group.name,
        slug: group.slug,
        description: group.description,
        icon: group.icon,
        sort_order: group.sort_order,
        is_system: group.is_system,
        created_at: group.created_at,
        updated_at: group.updated_at,
      },
      is_active: roleGroupsMap.get(group.id) || false,
      switches: (group.switches || [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((sw: any) => ({
          switch: {
            id: sw.id,
            group_id: sw.group_id,
            name: sw.name,
            slug: sw.slug,
            description: sw.description,
            sort_order: sw.sort_order,
            is_system: sw.is_system,
            created_at: sw.created_at,
            updated_at: sw.updated_at,
          },
          is_active: roleSwitchesMap.get(sw.id) || false,
        })),
    }));

    return NextResponse.json({
      role,
      groups: groupsWithPermissions,
    });
  } catch (error) {
    console.error("Error in GET /api/roles/permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
