export const dynamic = "force-dynamic";
import { AuthForm } from "@/components/auth/auth-form";
import { supabaseConfig } from "@/lib/supabase/config";
import { verifiedUser } from "@/lib/server/auth/context";
import { redirect } from "next/navigation";
export default async function Page() {
  if (await verifiedUser()) redirect("/");
  return (
    <AuthForm
      mode="signup"
      configured={
        !!supabaseConfig() &&
        !!process.env.SUPABASE_SECRET_KEY &&
        !!process.env.APP_BASE_URL
      }
    />
  );
}
