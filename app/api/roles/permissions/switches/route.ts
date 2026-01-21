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
    const { role_id, switch_id, is_active } = body;

    if (!role_id || !switch_id || is_active === undefined) {
      return NextResponse.json(
        { error: "role_id, switch_id, and is_active are required" },
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

    // Validate that the switch exists
    const { data: switchData, error: switchError } = await supabase
      .from("permission_switches")
      .select("id")
      .eq("id", switch_id)
      .single();

    if (switchError || !switchData) {
      return NextResponse.json(
        { error: "Permission switch not found" },
        { status: 404 }
      );
    }

    // Upsert the role permission switch using service client to bypass RLS
    const { data, error } = await serviceSupabase
      .from("role_permission_switches")
      .upsert(
        {
          role_id,
          switch_id,
          is_active,
        },
        {
          onConflict: "role_id,switch_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error upserting role permission switch:", error);
      return NextResponse.json(
        { error: "Failed to update role permission switch", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in POST /api/roles/permissions/switches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
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

    const body = await request.json();
    const { role_id, switch_id, is_active } = body;

    if (!role_id || !switch_id || is_active === undefined) {
      return NextResponse.json(
        { error: "role_id, switch_id, and is_active are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("role_permission_switches")
      .update({ is_active })
      .eq("role_id", role_id)
      .eq("switch_id", switch_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating role permission switch:", error);
      return NextResponse.json(
        { error: "Failed to update role permission switch" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PUT /api/roles/permissions/switches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
