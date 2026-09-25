"use client";
import { useState } from "react";
import { ShopifyConnection } from "@/components/backend/shopify-connection";
import type { ShopifySummary } from "@/types/shopify";
import { Check, Plug, ShieldCheck } from "lucide-react";
import {
  Badge,
  Card,
  Modal,
  PageHeading,
  Tabs,
} from "@/components/ui/primitives";
const integrations = [
  [
    "WooCommerce",
    "Store",
    "Your WordPress store, in one clear overview.",
    "W",
    false,
  ],
  [
    "Meta Ads",
    "Advertising",
    "Understand your Facebook and Instagram campaigns.",
    "∞",
    true,
  ],
  [
    "TikTok Ads",
    "Advertising",
    "See what resonates with your next customers.",
    "♪",
    false,
  ],
  [
    "Google Ads",
    "Advertising",
    "Track the searches that turn into sales.",
    "G",
    false,
  ],
  [
    "Snapchat Ads",
    "Advertising",
    "Give your discovery campaigns more context.",
    "S",
    false,
  ],
  [
    "Email",
    "Communication",
    "Keep every customer conversation in one place.",
    "@",
    true,
  ],
  [
    "WhatsApp",
    "Communication",
    "Meet your customers where they already are.",
    "W",
    false,
  ],
  [
    "Booking.com",
    "Hospitality",
    "See your reservations and guest information.",
    "B.",
    false,
  ],
  [
    "Airbnb",
    "Hospitality",
    "A little more clarity for every stay.",
    "A",
    false,
  ],
] as const;
export function IntegrationsPage({ shopify }: { shopify: ShopifySummary }) {
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState("");
  const [connected, setConnected] = useState<string[]>([]);
  const [step, setStep] = useState(false);
  return (
    <>
      <PageHeading
        title="Integrations"
        description="Your tools, working better together."
      >
        <Badge tone="gray">Shopify · Read only</Badge>
      </PageHeading>
      <div className="integration-banner">
        <span className="agent-icon tone-0">
          <Plug size={26} />
        </span>
        <div>
          <h2>Connect your business. We’ll bring it together.</h2>
          <p>
            Shopify starts with clear permissions. Other connections remain
            demos.
          </p>
        </div>
        <ShieldCheck size={28} />
      </div>
      <Tabs
        options={[
          "All",
          "Store",
          "Advertising",
          "Communication",
          "Finance",
          "Hospitality",
        ]}
        value={category}
        onChange={setCategory}
      />
      <div className="three-grid">
        {["All", "Store"].includes(category) && (
          <ShopifyConnection connection={shopify} />
        )}
        {integrations
          .filter((i) => category === "All" || i[1] === category)
          .map(([name, group, description, logo, initial]) => (
            <Card key={name}>
              <div className="product-info">
                <div className="detail-row">
                  <span className="integration-logo">{logo}</span>
                  <Badge tone="gray">{group}</Badge>
                </div>
                <h3>{name}</h3>
                <p className="integration-description">{description}</p>
                <div className="detail-row">
                  {initial || connected.includes(name) ? (
                    <Badge>Connected · Demo</Badge>
                  ) : (
                    <span className="muted">Not connected</span>
                  )}
                  <button
                    className="button"
                    onClick={() => {
                      setSelected(name);
                      setStep(false);
                    }}
                  >
                    {initial || connected.includes(name) ? "Manage" : "Connect"}
                  </button>
                </div>
              </div>
            </Card>
          ))}
      </div>
      {category === "Finance" && (
        <Card>
          <div className="empty">
            <ShieldCheck size={30} />
            <h3>Accounting connections are on the way</h3>
            <p>For now, explore the profitability breakdown in Finance.</p>
          </div>
        </Card>
      )}
      {selected && (
        <Modal title={`Connect ${selected}`} onClose={() => setSelected("")}>
          <div className="preview-icon">{step ? <Check /> : <Plug />}</div>
          <h3>
            {step
              ? "Your demo connection is ready"
              : `Bring ${selected} into your workspace`}
          </h3>
          <p className="muted">
            {step
              ? "You’ve previewed the connection flow. No account was accessed and no business data was imported."
              : "In the finished experience, you’ll securely sign in to your account and choose what to share. This preview uses sample data only."}
          </p>
          <button
            className="button primary"
            onClick={() => {
              if (step) setSelected("");
              else {
                setConnected([...connected, selected]);
                setStep(true);
              }
            }}
          >
            {step ? "Done" : "Preview connection"}
          </button>
        </Modal>
      )}
    </>
  );
}
