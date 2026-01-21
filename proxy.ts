import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function proxy(request: NextRequest) {
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
  if (user && (pathname === "/" || pathname === "/login" || pathname === "/register")) {
    // Check if user has completed onboarding
    const onboardingCompleted = user.user_metadata?.onboarding_completed;
    // if (!onboardingCompleted) {
    //   return NextResponse.redirect(new URL("/onboarding", request.url));
    // } else {
    //   return NextResponse.redirect(new URL("/dashboard", request.url));
    // }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If authenticated user tries to access onboarding but has already completed it, redirect to dashboard
  // if (user && pathname.startsWith("/onboarding")) {
  //   const onboardingCompleted = user.user_metadata?.onboarding_completed;
  //   if (onboardingCompleted) {
  //     return NextResponse.redirect(new URL("/dashboard", request.url));
  //   }
  // }

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