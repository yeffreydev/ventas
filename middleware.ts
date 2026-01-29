import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Define route to permission mapping
const routePermissions: Record<string, string> = {
  "/products": "products",
  "/orders": "orders",
  "/customers": "customers",
  "/chats": "chats",
  "/scheduled-messages": "scheduled_messages",
  "/kanban": "kanban",
  "/payments": "payments",
  "/integrations": "integrations",
  "/automation": "automation",
  "/config/teams": "teams",
  "/config": "config",
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Define public routes that don't require authentication
  const publicRoutes = [
    "/login",
    "/register",
    "/onboarding",
    "/welcome",
    "/botia.svg",
    "/api/webhooks", // Webhooks should be public for external services
    "/api/realtime", // SSE endpoint should be accessible
  ];

  // Check if current path is public
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(route + "/")
  );

  // If not authenticated and trying to access protected route, redirect to login
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If authenticated and trying to access login/register/onboarding or root, redirect to dashboard
  // But check if user has completed onboarding first
  if (user && (pathname === "/" || pathname === "/login" || pathname === "/register" || pathname === "/onboarding" || pathname === "/welcome")) {
    // Check if user has workspaces before redirecting to dashboard
    const { data: workspaces } = await supabase
      .from('user_accessible_workspaces')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    
    // If no workspaces
    if (!workspaces || workspaces.length === 0) {
      // If we are already at /welcome or /onboarding, let them proceed
      if (pathname === "/welcome" || pathname === "/onboarding") {
        return response;
      }
      // Otherwise redirect to welcome
      return NextResponse.redirect(new URL("/welcome", request.url));
    }
    
    // Has workspaces, redirect to dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // CRITICAL: If authenticated user tries to access any protected route but has NO workspaces
  // Redirect them to onboarding to prevent flash of dashboard content
  if (user && !isPublicRoute && pathname !== "/create-workspace" && !pathname.startsWith("/api/")) {
    const { data: workspaces } = await supabase
      .from('user_accessible_workspaces')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    
    // If no workspaces, redirect to welcome page
    if (!workspaces || workspaces.length === 0) {
      console.log('[Middleware] User has no workspaces, redirecting to welcome');
      return NextResponse.redirect(new URL("/welcome", request.url));
    }

    // CHECK PERMISSIONS (RBAC)
    // Find matching permission requirement
    let requiredPermission: string | null = null;
    
    // Check specific routes first (e.g., config/teams before config)
    const sortedRoutes = Object.keys(routePermissions).sort((a, b) => b.length - a.length);
    
    for (const route of sortedRoutes) {
      if (pathname === route || pathname.startsWith(`${route}/`)) {
        requiredPermission = routePermissions[route];
        break;
      }
    }

    if (requiredPermission) {
      // Get user's current workspace
      const { data: workspaceData } = await supabase
        .from('user_accessible_workspaces')
        .select('id, is_owner')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (!workspaceData) {
        console.log(`[Middleware] User ${user.id} has no workspace`);
        return NextResponse.redirect(new URL("/welcome", request.url));
      }

      // CRITICAL FIX: If user is owner, ALWAYS allow all access
      if (workspaceData.is_owner === true) {
        console.log(`[Middleware] User ${user.id} is owner - GRANTED ACCESS to ${pathname}`);
        return response;
      }

      // Get user permissions for current workspace using new function
      const { data: permissions, error } = await supabase.rpc("get_user_permissions", {
        p_user_id: user.id,
        p_workspace_id: workspaceData.id,
      });

      if (error) {
        console.error('[Middleware] Error getting permissions:', error);
        // CRITICAL: If error getting permissions and user has workspace access, allow (fail open)
        console.log('[Middleware] Allowing access due to RPC error (fail open)');
        return response;
      }

      // Check if user has the required permission (simplified module-based check)
      if (permissions) {
        // If user has "all" permission, grant access
        if (permissions.all === true) {
          console.log(`[Middleware] User ${user.id} has ALL permissions - GRANTED ACCESS`);
          return response;
        }

        // Simplified check: if module is true, user has access
        if (permissions[requiredPermission] === true) {
          console.log(`[Middleware] User ${user.id} has ${requiredPermission} module active - GRANTED ACCESS`);
          return response;
        }
      }

      console.log(`[Middleware] User ${user.id} DENIED access to ${pathname} (requires ${requiredPermission}), permissions:`, permissions);
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};