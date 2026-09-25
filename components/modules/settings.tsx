"use client";
import { useState } from "react";
import {
  useIdentity,
  SignOutButton,
} from "@/components/workspace/identity-provider";
import { AIEngineSettings } from "@/components/backend/ai-engine-settings";
import type { BackendStatus } from "@/types/backend";
import { AIPreferences } from "@/components/intelligence/ai-preferences";
import {
  Badge,
  Card,
  PageHeading,
  useFeedback,
} from "@/components/ui/primitives";
export function SettingsPage({
  backendStatus,
  instructions,
  policies,
  connections,
}: {
  backendStatus: BackendStatus;
  instructions: React.ReactNode;
  policies: React.ReactNode;
  connections: React.ReactNode;
}) {
  const [section, setSection] = useState("Business Profile");
  const identity = useIdentity();
  const profile = identity.businesses.find(
    (b) => b.id === identity.businessId,
  )!;
  const [notifications, setNotifications] = useState<Record<string, boolean>>(
    {},
  );
  const { notify, preview } = useFeedback();
  return (
    <>
      <PageHeading
        title="Settings"
        description="Make this workspace feel like your business."
      />
      <div className="settings-layout">
        <div className="settings-nav">
          {[
            "Business Profile",
            "Team",
            "Notifications",
            "AI Engine",
            "AI Preferences",
            "Permissions",
            "Billing",
            "Security",
          ].map((s) => (
            <button
              key={s}
              className={s === section ? "selected" : ""}
              onClick={() => setSection(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <Card
          title={section}
          subtitle={
            section === "AI Engine"
              ? "Provider connections and secure storage are being prepared."
              : [
                    "Business Profile",
                    "Team",
                    "Permissions",
                    "AI Preferences",
                    "Security",
                  ].includes(section)
                ? "Your authenticated workspace."
                : "These preferences remain a demo."
          }
        >
          <div className="settings-form">
            {section === "Business Profile" ? (
              <>
                <h3>{profile.name}</h3>
                <p>{profile.business_type}</p>
                <p>
                  {profile.currency} · {profile.timezone}
                </p>
                <p className="muted">
                  Business identity saved during onboarding.
                </p>
              </>
            ) : section === "AI Engine" ? (
              <>
                <AIEngineSettings status={backendStatus} />
                {connections}
              </>
            ) : section === "AI Preferences" ? (
              <>
                <AIPreferences />
                {instructions}
              </>
            ) : section === "Notifications" ? (
              <>
                {[
                  "Daily business summary",
                  "Orders needing attention",
                  "AI approval requests",
                  "Weekly performance report",
                ].map((s) => (
                  <label className="checkbox-row" key={s}>
                    <span>{s}</span>
                    <input
                      type="checkbox"
                      checked={notifications[s] ?? true}
                      onChange={(e) =>
                        setNotifications({
                          ...notifications,
                          [s]: e.target.checked,
                        })
                      }
                    />
                  </label>
                ))}
              </>
            ) : section === "Team" ? (
              <>
                <div className="detail-row">
                  <div>
                    <h3>{identity.actorLabel}</h3>
                    <p>Workspace {identity.role}</p>
                  </div>
                  <Badge>{identity.role}</Badge>
                </div>
                <button
                  type="button"
                  className="button"
                  onClick={() => preview("Invite team member")}
                >
                  Invite team member
                </button>
              </>
            ) : section === "Permissions" ? (
              <>{policies}</>
            ) : section === "Billing" ? (
              <>
                <Badge tone="gray">Demo workspace</Badge>
                <h3>A foundation for your next chapter</h3>
                <p>No subscription or payment method is connected.</p>
                <button
                  className="button"
                  type="button"
                  onClick={() => preview("Billing and subscriptions")}
                >
                  Explore billing
                </button>
              </>
            ) : (
              <>
                <h3>Your workspace security</h3>
                <SignOutButton />
                <p>
                  Email/password sign-in uses Supabase. Workspace access is
                  checked on the server. Two-factor authentication is not
                  configured in this phase.
                </p>
                <button
                  className="button"
                  type="button"
                  onClick={() => preview("Security preferences")}
                >
                  Security options
                </button>
              </>
            )}
            {["Notifications"].includes(section) && (
              <button
                className="button primary"
                type="button"
                onClick={() =>
                  notify(
                    "Notification preferences saved for this demo session.",
                  )
                }
              >
                Save changes
              </button>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
