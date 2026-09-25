"use client";
import Link from "next/link";
import {
  useIdentity,
  WorkspaceSwitcher,
  SignOutButton,
} from "@/components/workspace/identity-provider";
import { IntelligenceCore } from "@/components/identity/intelligence-core";
import { CommandMenu } from "./command-menu";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  ChevronsUpDown,
  Command,
  Menu,
  Moon,
  PanelLeftClose,
  Search,
  Sparkles,
  Sun,
} from "lucide-react";
import { MotionPreferences } from "@/components/ui/motion-preferences";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { useBrain } from "@/components/brain/brain-provider";
import { BrainProvider } from "@/components/brain/brain-provider";
import { DemoProvider } from "@/components/intelligence/demo-provider";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { navigation } from "@/lib/navigation";
import { FeedbackProvider, Modal } from "@/components/ui/primitives";
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <MotionPreferences>
      <DemoProvider>
        <BrainProvider>
          <Shell>{children}</Shell>
        </BrainProvider>
      </DemoProvider>
    </MotionPreferences>
  );
}
function Shell({ children }: { children: React.ReactNode }) {
  const identity = useIdentity();
  const business = identity.businesses.find(
    (b) => b.id === identity.businessId,
  )!;
  const path = usePathname();
  const { running, paused, state } = useBrain();
  const reducedMotion = useReducedMotion();
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [dialog, setDialog] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setDialog("Quick navigation");
      }
      if (event.key === "Escape") setMobile(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const links = navigation.flatMap((group) => group.items);
  const title = links.find((item) => item.href === path)?.name ?? "Welcome";
  return (
    <div
      className={`app design-v2 route-${path === "/" ? "overview" : path.slice(1)} ${dark ? "dark" : ""} ${collapsed ? "collapsed" : ""} ${reducedMotion ? "reduce-motion" : ""}`}
    >
      <FeedbackProvider>
        {mobile && (
          <button
            className="drawer-backdrop"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          />
        )}
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <aside
          id="workspace-navigation"
          className={`sidebar ${mobile ? "open" : ""}`}
        >
          <Link
            href="/"
            className="brand anti-nerd-brand"
            aria-label="Anti-Nerd home"
            title="Anti-Nerd — Business made simple."
          >
            <span className="brand-sigil" aria-hidden="true">
              A<span>·</span>
            </span>
            <span className="wordmark-full">
              Anti-Nerd
              <span className="wordmark-tagline">Business made simple.</span>
            </span>
            <span className="wordmark-compact" aria-hidden="true">
              AN
            </span>
          </Link>
          <button
            className="workspace"
            onClick={() => setDialog("Your workspace")}
          >
            <span className="workspace-logo">
              {business.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="sidebar-copy">
              <strong>{business.name}</strong>
              <small>
                {identity.commerceConnections.find(
                  (c) =>
                    c.business_id === business.id &&
                    c.organization_id === identity.organizationId,
                )?.status === "connected"
                  ? "Shopify · Connected"
                  : `${business.business_type} · Switch business`}
              </small>
            </span>
            <ChevronsUpDown size={14} className="sidebar-copy" />
          </button>
          <nav aria-label="Main navigation">
            {navigation.map((group) => (
              <div className="nav-group" key={group.label}>
                {group.label && (
                  <div className="nav-label sidebar-copy">{group.label}</div>
                )}
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.name}
                    aria-current={path === item.href ? "page" : undefined}
                    className={`nav-item ${path === item.href ? "active" : ""}`}
                    onClick={() => setMobile(false)}
                  >
                    <item.icon size={18} />
                    <span className="sidebar-copy">{item.name}</span>
                    {item.name === "Inbox" && (
                      <span className="nav-count sidebar-copy">5</span>
                    )}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="team-note sidebar-copy">
              <span className="live-dot" />
              Business made simple.
              <small>Your AI team has your back.</small>
            </div>
            <button
              className="profile"
              onClick={() => setDialog("Your account")}
            >
              <span className="avatar">
                {identity.actorLabel.slice(0, 2).toUpperCase()}
              </span>
              <span className="sidebar-copy">
                <strong>{identity.actorLabel}</strong>
                <small>Workspace {identity.role}</small>
              </span>
              <ChevronsUpDown size={14} className="sidebar-copy" />
            </button>
          </div>
        </aside>
        <div className="main-wrap">
          <header className="topbar">
            <div className="topbar-left">
              <button
                className="icon-button desktop-toggle"
                aria-label="Toggle sidebar"
                onClick={() => setCollapsed(!collapsed)}
              >
                <PanelLeftClose size={18} />
              </button>
              <button
                className="icon-button mobile-toggle"
                aria-label="Open navigation"
                aria-expanded={mobile}
                aria-controls="workspace-navigation"
                onClick={() => setMobile(true)}
              >
                <Menu size={20} />
              </button>
              <span className="breadcrumb">
                Workspace <span>/</span>
              </span>
              <strong>{title}</strong>
            </div>
            <div className="topbar-actions">
              <button
                className="button ask-assistant-button"
                aria-label="Ask Anti-Nerd"
                onClick={() => setAssistantOpen(true)}
                aria-haspopup="dialog"
              >
                <IntelligenceCore
                  status={state.status}
                  paused={paused}
                  compact
                />
                <span>
                  Ask Anti-Nerd
                  <span className="ask-hint">Ask. Decide. Build.</span>
                </span>
                <span className="ask-shortcut">↗</span>
              </button>
              <button
                className="command-search"
                aria-label="Quick navigation"
                onClick={() => setDialog("Quick navigation")}
              >
                <Search size={15} />
                <span>Search anything…</span>
                <kbd>
                  <Command size={10} /> K
                </kbd>
              </button>
              <span className="ai-status">
                <Sparkles size={14} />
                AI Team <span className="live-dot" />{" "}
                <span>{running && !paused ? "Demo preview" : "Ready"}</span>
              </span>
              <button
                className="icon-button"
                aria-label="Toggle dark mode"
                onClick={() => setDark(!dark)}
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                className="icon-button notification-button"
                aria-label="Notifications"
                onClick={() => setDialog("Notifications")}
              >
                <Bell size={18} />
                <i />
              </button>
              <button
                className="avatar small"
                aria-label="Account menu"
                onClick={() => setDialog("Your account")}
              >
                DK
              </button>
            </div>
          </header>
          <main id="main-content">
            <div key={path} className="page-enter">
              {children}
            </div>
            <footer>
              <span>
                Anti-Nerd <span className="footer-dot">·</span> Business made
                simple.
              </span>
              <span>
                <span className="live-dot" /> Demo workspace · Sample data
              </span>
            </footer>
          </main>
        </div>
        <AssistantPanel
          open={assistantOpen}
          onClose={() => setAssistantOpen(false)}
        />
        {dialog === "Quick navigation" && (
          <CommandMenu
            onClose={() => setDialog("")}
            onAsk={() => setAssistantOpen(true)}
          />
        )}
        {dialog && dialog !== "Quick navigation" && (
          <Modal title={dialog} onClose={() => setDialog("")}>
            {dialog === "Notifications" ? (
              <>
                <p>
                  3 delayed orders and 5 customer conversations need your
                  review.
                </p>
                <Link
                  className="button primary"
                  href="/activity"
                  onClick={() => setDialog("")}
                >
                  Review activity
                </Link>
              </>
            ) : dialog === "Your workspace" ? (
              <WorkspaceSwitcher />
            ) : (
              <>
                <p>
                  {identity.actorLabel} · Workspace {identity.role}
                </p>
                <SignOutButton />
                <Link
                  className="button primary"
                  href="/settings"
                  onClick={() => setDialog("")}
                >
                  Account settings
                </Link>
              </>
            )}
          </Modal>
        )}
      </FeedbackProvider>
    </div>
  );
}
