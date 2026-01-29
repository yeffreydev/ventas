import { createClient } from "@/app/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createNotification } from "@/app/lib/notifications";

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
    const myInvitations = searchParams.get("my_invitations") === "true";
    const workspaceId = searchParams.get("workspace_id");

    if (myInvitations) {
      // Use RPC function to get invitations excluding rejected ones
      const { data: invitations, error } = await supabase.rpc(
        'get_user_pending_invitations',
        { user_email: user.email, user_uuid: user.id }
      );

      if (error) {
        console.error("Error fetching user invitations:", error);
        return NextResponse.json(
          { error: "Failed to fetch invitations" },
          { status: 500 }
        );
      }

      return NextResponse.json(invitations || []);
    }

    // For workspace invitations (admin view)
    let query = supabase
      .from("pending_invitations")
      .select("*");

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    query = query.order("created_at", { ascending: false });

    const { data: invitations, error } = await query;

    if (error) {
      console.error("Error fetching invitations:", error);
      return NextResponse.json(
        { error: "Failed to fetch invitations" },
        { status: 500 }
      );
    }

    return NextResponse.json(invitations);
  } catch (error) {
    console.error("Error in GET /api/invitations:", error);
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
      email,
      role_id,
      display_name,
      max_concurrent_chats,
      specialties,
      languages,
      message,
      workspace_name, // Added this
      workspace_id,
    } = body;


    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Get agent role if not specified
    let finalRoleId = role_id;
    if (!finalRoleId) {
      // Try to get the agent role - use a direct query to bypass RLS issues
      const { data: roles, error: roleError } = await supabase
        .from("roles")
        .select("id, slug")
        .eq("slug", "agent")
        .limit(1);
      
      if (roleError) {
        console.error("Error fetching agent role:", roleError);
        console.error("Role error details:", JSON.stringify(roleError, null, 2));
        return NextResponse.json(
          {
            error: "Error fetching agent role from database",
            details: roleError.message,
            hint: "Check RLS policies on roles table"
          },
          { status: 500 }
        );
      }
      
      if (!roles || roles.length === 0) {
        console.error("Agent role not found in database");
        return NextResponse.json(
          {
            error: "Agent role not found in database",
            details: "Please verify that the 'agent' role exists in public.roles table",
            hint: "Run: SELECT * FROM public.roles WHERE slug = 'agent';"
          },
          { status: 500 }
        );
      }
      
      finalRoleId = roles[0].id;
    }

    // Check if user already has an invitation pending
    let checkQuery = supabase
      .from("agent_invitations")
      .select("id")
      .eq("email", email)
      .eq("status", "pending");

    if (workspace_id) {
      checkQuery = checkQuery.eq("workspace_id", workspace_id);
    }

    const { data: existingInvitation, error: checkError } = await checkQuery.maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Error checking existing invitation:", checkError);
    }

    if (existingInvitation) {
      return NextResponse.json(
        { error: "User already has a pending invitation for this workspace" },
        { status: 400 }
      );
    }

    // Create invitation
    const { data: invitation, error } = await supabase
      .from("agent_invitations")
      .insert({
        email,
        invited_by: user.id,
        role_id: finalRoleId,
        display_name,
        max_concurrent_chats: max_concurrent_chats || 5,
        specialties: specialties || [],
        languages: languages || ["es"],
        message,
        workspace_id: workspace_id || null, 
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating invitation:", error);
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 }
      );
    }

    // Common variables
    const cleanEmail = email.trim();
    const businessName = workspace_name || 'CRM-IA';

    // Construct the base URL from the request
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    // Get Role Name for email and notification
    let roleName = "Agente";
    if (finalRoleId) {
      const { data: roleData } = await supabase
        .from("roles")
        .select("name")
        .eq("id", finalRoleId)
        .single();
        
      if (roleData) {
        roleName = roleData.name;
      }
    }

    // Send invitation email using Resend
    try {
      console.log("Attempting to send email via Resend...");
      const emailEnabled = process.env.ENABLE_INVITATION_EMAILS === 'true';

      if (!emailEnabled) {
          console.log("🚫 Email sending disabled by configuration (ENABLE_INVITATION_EMAILS != 'true')");
      } else if (process.env.RESEND_API_KEY) {
        console.log("RESEND_API_KEY found:", process.env.RESEND_API_KEY.substring(0, 5) + "...");

        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        const invitationLink = `${baseUrl}/accept-invitation?token=${invitation.token}`;
        
        console.log("Sending email to (clean):", `'${cleanEmail}'`);
        console.log("From:", process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev');

        const { data, error: resendError } = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: [cleanEmail], // Wrap in array and use clean email
          subject: `Has sido invitado a ${businessName} en Botia`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>¡Hola!</h2>
              <p>Has sido invitado por <strong>${user.email}</strong> para unirte a <strong>${businessName}</strong> en Botia con el rol de <strong>${roleName}</strong>.</p>
              
              ${message ? `<p><strong>Mensaje:</strong> "${message}"</p>` : ''}
              
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Especialidades:</strong> ${specialties?.join(', ') || 'General'}</p>
              </div>

              <a href="${invitationLink}" style="display: inline-block; background-color: #0000FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Aceptar Invitación
              </a>
              
              <p style="margin-top: 30px; font-size: 12px; color: #666;">
                Si no esperabas esta invitación, puedes ignorar este correo via: Botia
              </p>
            </div>
          `
        });

        if (resendError) {
            console.error("Resend API Error:", JSON.stringify(resendError, null, 2));
        } else {
            console.log("Resend API Success:", JSON.stringify(data, null, 2));
        }

      } else {
        console.warn("RESEND_API_KEY not found in environment variables");
      }
    } catch (emailError) {
      console.error("Unexpected error sending email:", emailError);
    }

    // Send in-app notification if user exists
    try {
      console.log("Attempting to find user for in-app notification...");
      
      const { data: targetUserId, error: rpcError } = await supabase.rpc('get_user_id_by_email', { 
          email_input: cleanEmail 
      });

      if (rpcError) {
          console.error("RPC Lookup Error:", rpcError);
      }

      if (targetUserId) {
        console.log("Sending notification to:", targetUserId);
        
        // Check if notification already exists for this invitation
        const { data: existingNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", targetUserId)
          .eq("type", "invitation")
          .filter("metadata->invitation_id", "eq", invitation.id)
          .maybeSingle();

        if (!existingNotif) {


          const notif = await createNotification({
            user_id: targetUserId,
            type: 'invitation',
            title: `Invitación a ${businessName}`,
            message: `Has sido invitado a unirte a ${businessName} como ${roleName}. Haz clic para ver los detalles y aceptar.`,
            priority: 'high',
            action_url: `${baseUrl}/accept-invitation?token=${invitation.token}`,
            metadata: {
              invitation_id: invitation.id,
              invitation_token: invitation.token,
              workspace_id: workspace_id,
              workspace_name: businessName,
              inviter_email: user.email,
              role_name: roleName,
              modules: specialties || []
            }
          });
          
          if (notif) {
            console.log("✅ Notification sent successfully.");
          } else {
            console.error("❌ Notification creation failed.");
          }
        } else {
          console.log("⚠️ Notification already exists for this invitation, skipping.");
        }
      } else {
        console.log("No matching user ID found via RPC. User not registered yet.");
        // We could send an email here inviting them to register if email service is active
        // But the main email flow above handles the invitation link.
        // When they register, we need a way to connect them to this invitation.
        // The /register page should handle the 'invitation' query param.
      }

    } catch (notificationError) {
      console.error("Error sending in-app notification:", notificationError);
    }

    return NextResponse.json({
      success: true,
      invitation,
      invitation_link: `${baseUrl}/accept-invitation?token=${invitation.token}`,
    }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/invitations:", error);
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
      .from("agent_invitations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting invitation:", error);
      return NextResponse.json(
        { error: "Failed to delete invitation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/invitations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}