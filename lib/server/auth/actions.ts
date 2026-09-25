"use server";
import "server-only";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { sessionClient } from "../db/client";
import { BackendError } from "../errors";
import { rateLimiter } from "../security/rate-limit";
import { businessCookie, workspaceCookie, requireUser } from "./context";
import type { ReadToolName, ToolOutputs } from "@/types/backend";
export type FormState = {
  message: string;
  ok?: boolean;
  readResult?: ToolOutputs[ReadToolName];
};
export async function sameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  const base = process.env.APP_BASE_URL;
  if (!origin || !base || new URL(origin).origin !== new URL(base).origin)
    throw new BackendError("NOT_AUTHORIZED", "Request origin is not allowed.");
}
function authInput(form: FormData) {
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(form.get("password") ?? "");
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length > 128
  )
    throw new BackendError("INVALID_INPUT", "Check your email and password.");
  return { email, password };
}
export async function authAction(
  mode: string,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  let destination = "";
  try {
    await sameOrigin();
    const client = await sessionClient();
    if (mode === "reset") {
      const user = await requireUser();
      await rateLimiter.consume("auth", user.id);
      const password = String(form.get("password") ?? "");
      if (password.length < 12 || password.length > 128)
        return { message: "Use a password between 12 and 128 characters." };
      const { error } = await client.auth.updateUser({ password });
      if (error)
        return {
          message:
            "Your password could not be updated. Request a new recovery link.",
        };
      await client.auth.signOut({ scope: "global" });
      destination = "/login?message=password-updated";
    } else {
      const input = authInput(form);
      await rateLimiter.consume("auth", input.email);
      if (mode === "forgot") {
        await client.auth.resetPasswordForEmail(input.email, {
          redirectTo: `${process.env.APP_BASE_URL}/auth/confirm`,
        });
        return {
          ok: true,
          message:
            "If an account exists, you will receive a password reset email.",
        };
      }
      if (mode !== "login" && mode !== "signup")
        return { message: "This request is unavailable." };
      if (mode === "signup" && input.password.length < 12)
        return { message: "Use a password of at least 12 characters." };
      const { error, data } =
        mode === "signup"
          ? await client.auth.signUp({
              ...input,
              options: {
                emailRedirectTo: `${process.env.APP_BASE_URL}/auth/confirm`,
              },
            })
          : await client.auth.signInWithPassword(input);
      if (error)
        return {
          message:
            mode === "login"
              ? "Sign-in failed. Check your details and verify your email."
              : "We could not create the account. Try signing in or resetting your password.",
        };
      if (!data.session)
        return {
          ok: true,
          message: "Check your email to confirm your account, then sign in.",
        };
      destination = "/";
    }
    const jar = await cookies();
    jar.delete(workspaceCookie);
    jar.delete(businessCookie);
  } catch (error) {
    return {
      message:
        error instanceof BackendError && error.code === "RATE_LIMITED"
          ? error.message
          : "Account access is unavailable. Check the server configuration or try again later.",
    };
  }
  redirect(destination);
}
export async function signOut() {
  await sameOrigin();
  const client = await sessionClient();
  await client.auth.signOut();
  const jar = await cookies();
  jar.delete(workspaceCookie);
  jar.delete(businessCookie);
  redirect("/login");
}
