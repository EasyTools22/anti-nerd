import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = supabaseConfig();
  const isPublic =
    [
      "/login",
      "/signup",
      "/forgot-password",
      "/reset-password",
      "/auth/confirm",
    ].includes(request.nextUrl.pathname) ||
    request.nextUrl.pathname.startsWith("/api/");
  let authenticated = false;
  if (config) {
    const client = createServerClient(config.url, config.key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (updates) => {
          updates.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          updates.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });
    try {
      const { data, error } = await client.auth.getClaims();
      authenticated = !error && !!data?.claims?.sub;
    } catch {
      authenticated = false;
    }
  }
  if (!authenticated && !isPublic) {
    const next = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.getAll().forEach((cookie) => next.cookies.set(cookie));
    response = next;
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
