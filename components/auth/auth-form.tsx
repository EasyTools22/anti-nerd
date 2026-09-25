"use client";
import Link from "next/link";
import { useActionState } from "react";
import { authAction } from "@/lib/server/auth/actions";
export function AuthForm({
  mode,
  configured,
  notice,
}: {
  mode: "login" | "signup" | "forgot" | "reset";
  configured: boolean;
  notice?: string;
}) {
  const [state, action, pending] = useActionState(authAction.bind(null, mode), {
    message: "",
  });
  const titles = {
    login: "Welcome back.",
    signup: "Your next chapter starts here.",
    forgot: "Let’s get you back in.",
    reset: "A fresh start.",
  };
  const buttons = {
    login: "Sign in",
    signup: "Create account",
    forgot: "Send reset link",
    reset: "Update password",
  };
  return (
    <main className="auth-page design-v2">
      <div className="auth-story">
        <Link className="auth-brand" href="/login">
          anti-nerd<span>Business made simple.</span>
        </Link>
        <div>
          <p className="eyebrow">YOUR BUSINESS. YOUR WAY.</p>
          <h1>
            Less complexity.
            <br />
            More possibility.
          </h1>
          <p>A clear space to build your business, with you in control.</p>
        </div>
        <small>Your workspace. Your team. Your decisions.</small>
      </div>
      <section className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">ANTI-NERD</p>
          <h2>{titles[mode]}</h2>
          <p className="muted">
            {mode === "signup"
              ? "Create your account, then make room for your business."
              : mode === "forgot"
                ? "We’ll email you a secure link to reset your password."
                : "Business made simple. One step at a time."}
          </p>
          {!configured && (
            <div className="auth-notice" role="status">
              Account setup is pending. Configure Supabase and apply the
              database migrations to enable sign-in.
            </div>
          )}
          {notice && (
            <p className="auth-notice" role="status">
              {notice}
            </p>
          )}
          <form action={action} className="settings-form">
            {mode !== "reset" && (
              <label className="field-label">
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  placeholder="you@yourbusiness.com"
                />
              </label>
            )}
            {mode !== "forgot" && (
              <label className="field-label">
                Password
                <input
                  name="password"
                  type="password"
                  minLength={mode === "login" ? 1 : 12}
                  maxLength={128}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  required
                />
                {mode !== "login" && <small>At least 12 characters.</small>}
              </label>
            )}
            {state.message && (
              <p role={state.ok ? "status" : "alert"} className="auth-notice">
                {state.message}
              </p>
            )}
            <button
              className="button primary"
              disabled={pending || !configured}
            >
              {pending ? "One moment…" : buttons[mode]}
            </button>
          </form>
          <div className="auth-links">
            {mode === "login" ? (
              <>
                <Link href="/forgot-password">Forgot password?</Link>
                <span>
                  New here? <Link href="/signup">Create an account</Link>
                </span>
              </>
            ) : (
              <Link href="/login">Back to sign in</Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
