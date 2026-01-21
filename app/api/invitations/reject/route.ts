import { createClient } from "@/app/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Use the database function to reject invitation
    const { data, error } = await supabase.rpc("reject_agent_invitation", {
      invitation_token: token,
      user_uuid: user.id,
    });

    if (error) {
      console.error("Error rejecting invitation:", error);
      return NextResponse.json(
        { error: "Failed to reject invitation" },
        { status: 500 }
      );
    }

    if (!data.success) {
      return NextResponse.json(
        { error: data.error || "Failed to reject invitation" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: data.message || "Invitation rejected",
    });
  } catch (error) {
    console.error("Error in POST /api/invitations/reject:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}