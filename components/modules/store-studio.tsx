"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Monitor,
  Smartphone,
  ScanLine,
  Check,
} from "lucide-react";
import { StorefrontPreview } from "./storefront-preview";
import { Confidence } from "@/components/ui/product-signals";
export function StoreStudio() {
  const [device, setDevice] = useState("Desktop");
  const [active, setActive] = useState(false);
  const [applied, setApplied] = useState(false);
  return (
    <section className="store-studio">
      <div className="studio-bar">
        <span>
          <span className="studio-status-dot" />
          wkexclusive.example <small>Concept store</small>
        </span>
        <div className="device-switch" aria-label="Store preview device">
          {["Desktop", "Mobile"].map((d) => (
            <button
              key={d}
              aria-pressed={device === d}
              onClick={() => setDevice(d)}
            >
              {d === "Desktop" ? (
                <Monitor size={15} />
              ) : (
                <Smartphone size={15} />
              )}
              <span>{d}</span>
            </button>
          ))}
        </div>
        <button
          className={`text-link ${active ? "selected" : ""}`}
          onClick={() => setActive((v) => !v)}
          aria-pressed={active}
        >
          <ScanLine size={15} />
          {active ? "Hide review" : "Review page"}
        </button>
      </div>
      <div className="studio-workbench">
        <div
          className={`studio-preview-frame device-${device.toLowerCase()} ${applied ? "proposal-applied" : ""}`}
        >
          <StorefrontPreview improved={applied} />
          {active && (
            <button
              className="store-hotspot"
              onClick={() => setApplied((v) => !v)}
              aria-label={
                applied
                  ? "Undo proposed CTA change"
                  : "Preview proposed CTA change"
              }
            >
              <span>01</span>
              {applied ? "Proposed change shown" : "Make the next step clearer"}
              <ArrowUpRight size={14} />
            </button>
          )}
        </div>
        <aside className="studio-notes">
          <span className="section-kicker">STORE AGENT / PAGE REVIEW</span>
          <h2>
            A clearer path
            <br />
            to checkout.
          </h2>
          <p>
            Show delivery information beside the collection button. Give
            customers one less reason to hesitate.
          </p>
          <Confidence level="Medium" />
          <div className="studio-evidence">
            <span>WHY</span>
            <p>Delivery questions recur in our sample conversations.</p>
            <span>PROPOSED CHANGE</span>
            <p>Stronger button contrast and delivery reassurance.</p>
            <span>RISK / OWNER CONTROL</span>
            <p>Impact is unknown. This changes only the local preview.</p>
          </div>
          <button
            className="button primary"
            onClick={() => {
              setActive(true);
              setApplied((v) => !v);
            }}
          >
            {applied ? <Check size={15} /> : <ScanLine size={15} />}{" "}
            {applied ? "Undo preview" : "Preview the change"}
          </button>
          <small>Demo suggestion · No live store inspected or changed</small>
        </aside>
      </div>
    </section>
  );
}
