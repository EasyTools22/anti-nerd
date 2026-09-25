"use client";
import { useState } from "react";
import {
  Building2,
  ShoppingBag,
  Utensils,
  Briefcase,
  Store,
  ArrowLeft,
} from "lucide-react";
import { MutationForm } from "./mutation-form";
import { SignOutButton } from "./identity-provider";
const choices = [
  { value: "ecommerce", label: "E-commerce", icon: ShoppingBag },
  { value: "hospitality", label: "Accommodation", icon: Building2 },
  { value: "restaurant", label: "Restaurant", icon: Utensils },
  { value: "agency", label: "Agency", icon: Briefcase },
  { value: "other", label: "Other", icon: Store },
];
export function WorkspaceOnboarding() {
  const [step, setStep] = useState(1),
    [kind, setKind] = useState("ecommerce");
  return (
    <main className="onboarding identity-onboarding design-v2">
      <p className="eyebrow">ANTI-NERD · BUSINESS MADE SIMPLE.</p>
      <div className="onboarding-progress" aria-label={`Step ${step} of 2`}>
        <span className="complete">1</span>
        <span className={step === 2 ? "complete" : ""}>2</span>
      </div>
      <h1>
        {step === 1
          ? "What kind of business do you run?"
          : "Make yourself at home."}
      </h1>
      <p className="muted">
        Your own workspace, ready for your next chapter. Connect tools whenever
        you’re ready.
      </p>
      {step === 1 ? (
        <>
          <div className="business-type-grid">
            {choices.map((choice) => (
              <button
                key={choice.value}
                className={`business-type-card ${kind === choice.value ? "selected" : ""}`}
                aria-pressed={kind === choice.value}
                onClick={() => setKind(choice.value)}
              >
                <choice.icon size={24} />
                <strong>{choice.label}</strong>
              </button>
            ))}
          </div>
          <button className="button primary" onClick={() => setStep(2)}>
            Continue
          </button>
        </>
      ) : (
        <>
          <button className="text-link" onClick={() => setStep(1)}>
            <ArrowLeft size={15} />
            Back
          </button>
          <MutationForm operation="onboard" label="Create my workspace">
            <input type="hidden" name="kind" value={kind} />
            <label className="field-label">
              Workspace name
              <input
                name="organization"
                maxLength={120}
                required
                placeholder="Your company or team"
              />
            </label>
            <label className="field-label">
              Business name
              <input
                name="business"
                maxLength={120}
                required
                placeholder="Your first business"
              />
            </label>
            <p className="muted">
              You’ll be the workspace owner. No integration or payment required.
            </p>
          </MutationForm>
        </>
      )}
      <SignOutButton />
    </main>
  );
}
