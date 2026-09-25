import { AuthForm } from "@/components/auth/auth-form";
import { supabaseConfig } from "@/lib/supabase/config";
import { verifiedUser } from "@/lib/server/auth/context";
import { redirect } from "next/navigation";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  if (await verifiedUser()) redirect("/");
  const { message } = await searchParams;
  return (
    <AuthForm
      mode="login"
      configured={
        !!supabaseConfig() &&
        !!process.env.SUPABASE_SECRET_KEY &&
        !!process.env.APP_BASE_URL
      }
      notice={
        message === "password-updated"
          ? "Password updated. Sign in with your new password."
          : message === "invalid-link"
            ? "This link is invalid or expired. Request a new email."
            : undefined
      }
    />
  );
}
