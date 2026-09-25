import { NextResponse, type NextRequest } from "next/server";
import { sessionClient } from "@/lib/server/db/client";
import { businessCookie, workspaceCookie } from "@/lib/server/auth/context";
import { cookies } from "next/headers";
export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  let target = "/login?message=invalid-link";
  if (hash && hash.length <= 512 && (type === "email" || type === "recovery")) {
    try {
      const client = await sessionClient();
      const { error } = await client.auth.verifyOtp({ token_hash: hash, type });
      if (!error) {
        const jar = await cookies();
        jar.delete(workspaceCookie);
        jar.delete(businessCookie);
        target = type === "recovery" ? "/reset-password" : "/";
      }
    } catch {
      /* Never expose token or vendor error. */
    }
  }
  return NextResponse.redirect(new URL(target, request.url), {
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
