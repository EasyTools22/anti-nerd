"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Building2,
  ShoppingBag,
  Sparkles,
  Store,
  Utensils,
  Briefcase,
  Plug,
  Compass,
} from "lucide-react";
import { Badge, useFeedback } from "@/components/ui/primitives";
import { FounderJourney } from "@/components/intelligence/founder-journey";
import { launchJourney } from "@/lib/mock-data/product-shell";
import type { BusinessType } from "@/types/business";
const choices = [
  { name: "E-commerce", icon: ShoppingBag },
  { name: "Accommodation", icon: Building2 },
  { name: "Restaurant", icon: Utensils },
  { name: "Agency", icon: Briefcase },
  { name: "Other", icon: Store },
] satisfies { name: BusinessType; icon: typeof Store }[];
type Intent = "start" | "connect";
type Step =
  "intent" | "business" | "journey" | "platform" | "connection" | "ready";
const headings: Record<Exclude<Step, "business">, string> = {
  intent: "What do you want to do?",
  journey: "Your journey from idea to launch",
  platform: "Where do you manage your business?",
  connection: "Connect your business",
  ready: "Your demo workspace is ready",
};
export function OnboardingPage() {
  const [step, setStep] = useState<Step>("intent");
  const [intent, setIntent] = useState<Intent>("start");
  const [business, setBusiness] = useState<BusinessType>("E-commerce");
  const [platform, setPlatform] = useState("Shopify");
  const { preview } = useFeedback();
  const path: Step[] =
    intent === "start"
      ? ["intent", "business", "journey"]
      : ["intent", "business", "platform", "connection", "ready"];
  const index = path.indexOf(step);
  const options =
    business === "E-commerce"
      ? ["Shopify", "WooCommerce", "Other"]
      : business === "Accommodation"
        ? ["Airbnb", "Booking.com", "Other"]
        : ["My website", "In person", "Other"];
  const heading =
    step === "business"
      ? intent === "start"
        ? "What kind of business do you want to start?"
        : "What kind of business do you run?"
      : step === "platform" && business === "E-commerce"
        ? "Where do you sell?"
        : headings[step];
  return (
    <div
      className={`onboarding ${step === "intent" ? "onboarding-entry" : ""}`}
    >
      {step !== "intent" && (
        <div
          className="onboarding-progress"
          aria-label={`Step ${index + 1} of ${path.length}`}
        >
          {path.map((item, i) => (
            <span
              key={item}
              className={index >= i ? "complete" : ""}
              aria-current={step === item ? "step" : undefined}
            >
              {index > i ? <Check size={15} /> : i + 1}
            </span>
          ))}
        </div>
      )}
      <Badge tone="gray">ANTI-NERD · BUSINESS MADE SIMPLE.</Badge>
      <h1>{heading}</h1>
      <p className="muted">
        {step === "intent"
          ? "A new idea or an established business. Let’s start where you are."
          : step === "journey"
            ? "One clear step at a time. Here’s what Anti-Nerd will help you do."
            : "Just a few simple steps to feel right at home."}
      </p>
      {step === "intent" ? (
        <div className="onboarding-intents">
          <button
            className="intent-card"
            onClick={() => {
              setIntent("start");
              setStep("business");
            }}
          >
            <span className="agent-icon tone-3">
              <Sparkles size={24} />
            </span>
            <strong>Start a new business</strong>
            <p>
              Start from zero. Anti-Nerd helps you research, build and launch
              your business.
            </p>
            <span className="intent-cta">
              Start from scratch <ArrowRight size={16} />
            </span>
          </button>
          <button
            className="intent-card"
            onClick={() => {
              setIntent("connect");
              setStep("business");
            }}
          >
            <span className="agent-icon tone-0">
              <Plug size={24} />
            </span>
            <strong>Connect my business</strong>
            <p>
              Already running a business? Connect your existing tools and manage
              everything from Anti-Nerd.
            </p>
            <span className="intent-cta">
              Connect business <ArrowRight size={16} />
            </span>
          </button>
        </div>
      ) : step === "business" ? (
        <div className="onboarding-choices">
          {choices.map((choice) => (
            <button
              key={choice.name}
              aria-pressed={business === choice.name}
              className={business === choice.name ? "selected" : ""}
              onClick={() => {
                setBusiness(choice.name);
                setPlatform(
                  choice.name === "E-commerce"
                    ? "Shopify"
                    : choice.name === "Accommodation"
                      ? "Airbnb"
                      : "My website",
                );
              }}
            >
              <choice.icon size={26} />
              <strong>{choice.name}</strong>
              {business === choice.name && <Check size={16} />}
            </button>
          ))}
        </div>
      ) : step === "journey" ? (
        business === "E-commerce" ? (
          <>
            <FounderJourney />
            <div className="launch-journey">
              <div className="journey-heading">
                <span>Your e-commerce launch plan</span>
                <Badge tone="gray">Future journey · Demo only</Badge>
              </div>
              <ol>
                {launchJourney.map((item, i) => (
                  <li key={item.title}>
                    <span className="journey-number">{i + 1}</span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => preview(item.title)}
                      aria-label={`Preview ${item.title}`}
                    >
                      Preview <ArrowRight size={14} />
                    </button>
                  </li>
                ))}
              </ol>
              <p className="demo-caption">
                A roadmap preview. No research, store, payment account, or ad is
                created.
              </p>
            </div>
          </>
        ) : (
          <div className="onboarding-connection">
            <span className="agent-icon tone-3">
              <Compass size={24} />
            </span>
            <h3>A simpler start for your {business.toLowerCase()} business</h3>
            <p>
              Industry-specific setup journeys are coming later. For now, you
              can explore the e-commerce sample workspace to see how Anti-Nerd
              brings a business together.
            </p>
            <Badge tone="gray">Planning preview</Badge>
          </div>
        )
      ) : step === "platform" ? (
        <div className="onboarding-choices">
          {options.map((option) => (
            <button
              key={option}
              aria-pressed={platform === option}
              className={platform === option ? "selected" : ""}
              onClick={() => setPlatform(option)}
            >
              <Store size={26} />
              <strong>{option}</strong>
              {platform === option && <Check size={16} />}
            </button>
          ))}
        </div>
      ) : step === "connection" ? (
        <div className="onboarding-connection">
          <span className="connection-wordmark">Anti-Nerd</span>
          <span className="connection-line" />
          <span className="integration-logo">
            <Store />
          </span>
          <h3>Anti-Nerd + {platform}</h3>
          <p>
            This is a demo connection. No login, permissions, or live account
            access required.
          </p>
        </div>
      ) : (
        <div className="onboarding-connection">
          <span className="success-circle">
            <Check size={32} />
          </span>
          <h3>
            {business} · {platform}
          </h3>
          <p>
            Your connection preview is complete. Explore a workspace with sample
            data; no real account has been connected. Additional industry
            modules will follow.
          </p>
        </div>
      )}
      {step !== "intent" && (
        <div className="onboarding-buttons">
          <button className="button" onClick={() => setStep(path[index - 1])}>
            <ArrowLeft size={16} />
            Back
          </button>
          {step === "journey" || step === "ready" ? (
            <Link
              className="button primary"
              href={
                step === "journey" && business === "E-commerce"
                  ? "/research"
                  : "/"
              }
            >
              {step === "journey" ? "Explore demo workspace" : "Open dashboard"}
              <ArrowRight size={16} />
            </Link>
          ) : (
            <button
              className="button primary"
              onClick={() => setStep(path[index + 1])}
            >
              {step === "connection" ? "Connect demo workspace" : "Continue"}
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      )}
      <p className="demo-caption">
        A preview of what’s next. No real business is created or connected.
      </p>
    </div>
  );
}
