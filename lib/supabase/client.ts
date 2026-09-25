"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";
export function browserClient() {
  const config = supabaseConfig();
  if (!config) throw new Error("AUTH_NOT_CONFIGURED");
  return createBrowserClient(config.url, config.key);
}
