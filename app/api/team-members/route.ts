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
    const teamId = searchParams.get("team_id");

    let query = supabase
      .from("team_members")
      .select(`
        *,
        team:teams(*),
        user:user_id(email, raw_user_meta_data)
      `);

    if (teamId) {
      query = query.eq("team_id", teamId);
    }

    const { data: members, error } = await query;

    if (error) {
      console.error("Error fetching team members:", error);
      return NextResponse.json(
        { error: "Failed to fetch team members" },
        { status: 500 }
      );
    }

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error in GET /api/team-members:", error);
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
    const { team_id, user_id, role } = body;

    if (!team_id || !user_id) {
      return NextResponse.json(
        { error: "team_id and user_id are required" },
        { status: 400 }
      );
    }

    const { data: member, error } = await supabase
      .from("team_members")
      .insert({
        team_id,
        user_id,
        role: role || 'member',
      })
      .select(`
        *,
        team:teams(*),
        user:user_id(email, raw_user_meta_data)
      `)
      .single();

    if (error) {
      console.error("Error adding team member:", error);
      return NextResponse.json(
        { error: "Failed to add team member" },
        { status: 500 }
      );
    }

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/team-members:", error);
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
      .from("team_members")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error removing team member:", error);
      return NextResponse.json(
        { error: "Failed to remove team member" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/team-members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}