export const dynamic = "force-dynamic";
import { AuthForm } from "@/components/auth/auth-form";
import { supabaseConfig } from "@/lib/supabase/config";
export default function Page() {
  return (
    <AuthForm
      mode="forgot"
      configured={
        !!supabaseConfig() &&
        !!process.env.SUPABASE_SECRET_KEY &&
        !!process.env.APP_BASE_URL
      }
    />
  );
}
