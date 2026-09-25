"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
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
  useEffect(() => {
    // Only a UI invalidation signal; server membership checks remain authoritative.
    const selection = `${identity.organizationId}:${identity.businessId}`;
    const changed = (event: StorageEvent) => {
      if (
        event.key === "anti-nerd-active-business" &&
        event.newValue &&
        event.newValue !== selection
      )
        window.location.replace(window.location.pathname);
    };
    window.addEventListener("storage", changed);
    try {
      localStorage.setItem("anti-nerd-active-business", selection);
    } catch {
      /* Storage may be disabled. */
    }
    return () => window.removeEventListener("storage", changed);
  }, [identity.organizationId, identity.businessId]);
  return <Identity.Provider value={identity}>{children}</Identity.Provider>;
}
export function useIdentity() {
  const identity = useContext(Identity);
  if (!identity) throw new Error("Workspace identity is required.");
  return identity;
}
export function WorkspaceSwitcher() {
  const identity = useIdentity();
  const pathname = usePathname();
  const [adding, setAdding] = useState(false);
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
                    ? "Current business"
                    : `Switch to ${b.name}`
                }
                disabled={b.id === identity.businessId}
              >
                <input type="hidden" name="organization" value={org.id} />
                <input type="hidden" name="business" value={b.id} />
                <input type="hidden" name="returnTo" value={pathname} />
                <p className="muted">
                  {b.name} · {b.business_type}
                  <br />
                  Shopify ·{" "}
                  {identity.commerceConnections.find(
                    (c) =>
                      c.business_id === b.id && c.organization_id === org.id,
                  )?.status === "connected"
                    ? "Connected"
                    : "Not connected"}
                </p>
              </MutationForm>
            ))}
        </section>
      ))}
      {["owner", "admin"].includes(identity.role) && (
        <>
          <button
            className="button secondary"
            onClick={() => setAdding(!adding)}
          >
            {adding ? "Cancel" : "+ Add business"}
          </button>
          {adding && (
            <MutationForm operation="add-business" label="Add business">
              <input
                type="hidden"
                name="organization"
                value={identity.organizationId}
              />
              <input
                type="hidden"
                name="activeBusiness"
                value={identity.businessId}
              />
              <label>
                Business name
                <input name="business" required maxLength={120} />
              </label>
              <label>
                Business type
                <select name="kind" defaultValue="ecommerce">
                  <option value="ecommerce">E-commerce</option>
                  <option value="hospitality">Hospitality</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="agency">Agency</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <p className="muted">
                For e-commerce: connect Shopify next. WooCommerce and Anti-Nerd
                Store are coming later.
              </p>
            </MutationForm>
          )}
        </>
      )}
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
