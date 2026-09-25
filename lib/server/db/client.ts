import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseConfig } from "@/lib/supabase/config";
import { BackendError } from "../errors";
export async function sessionClient() {
  const config = supabaseConfig();
  if (!config)
    throw new BackendError(
      "DATABASE_UNAVAILABLE",
      "Workspace storage is not configured.",
    );
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (updates) => {
        try {
          updates.forEach(({ name, value, options }) =>
            jar.set(name, value, options),
          );
        } catch {
          /* Server Component: proxy persists the refresh cookies. */
        }
      },
    },
  });
}
/** Privileged client is private to server repositories. Never attach a user's cookies. */
export function persistenceClient() {
  const config = supabaseConfig();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!config || !secret)
    throw new BackendError(
      "DATABASE_UNAVAILABLE",
      "Durable storage is not configured.",
    );
  return createClient(config.url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
export function databaseError(
  error: { code?: string; message?: string } | null,
) {
  if (!error) return;
  const allowed = [
    "NOT_AUTHORIZED",
    "POLICY_CHANGED",
    "INVALID_ACTION",
    "INVALID_LIMIT",
    "WORKSPACE_LIMIT",
  ];
  const code = allowed.includes(error.message ?? "")
    ? error.message!
    : "DATABASE_UNAVAILABLE";
  throw new BackendError(code, "The request could not be completed.");
}
