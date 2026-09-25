export const dynamic = "force-dynamic";
import { AuthForm } from "@/components/auth/auth-form";
import { verifiedUser } from "@/lib/server/auth/context";
import { redirect } from "next/navigation";
export default async function Page() {
  if (!(await verifiedUser())) redirect("/forgot-password");
  return <AuthForm mode="reset" configured={true} />;
}
