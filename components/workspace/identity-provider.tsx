"use client";
import { createContext, useContext } from "react";
import type { WorkspaceIdentity } from "@/types/workspace";
import { MutationForm } from "./mutation-form";
import { signOut } from "@/lib/server/auth/actions";
const Identity = createContext<WorkspaceIdentity | null>(null);
export function IdentityProvider({
  identity,
  children,
}: {
  identity: WorkspaceIdentity;
  children: React.ReactNode;
}) {
  return <Identity.Provider value={identity}>{children}</Identity.Provider>;
}
export function useIdentity() {
  const identity = useContext(Identity);
  if (!identity) throw new Error("Workspace identity is required.");
  return identity;
}
export function WorkspaceSwitcher() {
  const identity = useIdentity();
  return (
    <div className="workspace-options">
      {identity.organizations.map((org) => (
        <section key={org.id}>
          <h3>{org.name}</h3>
          {identity.businesses
            .filter((b) => b.organization_id === org.id)
            .map((b) => (
              <MutationForm
                key={b.id}
                operation="switch"
                label={
                  b.id === identity.businessId
                    ? "Current workspace"
                    : `Open ${b.name}`
                }
                disabled={b.id === identity.businessId}
              >
                <input type="hidden" name="organization" value={org.id} />
                <input type="hidden" name="business" value={b.id} />
                <p className="muted">
                  {b.name} · {b.business_type}
                </p>
              </MutationForm>
            ))}
        </section>
      ))}
      <a className="text-link" href="/onboarding?new=1">
        Create another workspace
      </a>
    </div>
  );
}
export function SignOutButton() {
  return (
    <form action={signOut}>
      <button className="button" type="submit">
        Sign out
      </button>
    </form>
  );
}
