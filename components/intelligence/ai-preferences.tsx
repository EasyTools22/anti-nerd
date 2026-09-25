"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useDemo } from "./demo-provider";
import { Tabs } from "@/components/ui/primitives";
import type { AIInstruction, AutonomyMode } from "@/types/intelligence";
export function AIPreferences() {
  const { instructions, setInstructions, mode, setMode } = useDemo();
  function change<K extends keyof AIInstruction>(
    key: K,
    value: AIInstruction[K],
  ) {
    setInstructions((current) => ({ ...current, [key]: value }));
  }
  return (
    <>
      <h3>How should Anti-Nerd work?</h3>
      <p className="muted">
        Make the experience yours. These are demo preferences, not instructions
        sent to a real AI.
      </p>
      <label className="field-label">
        Communication style
        <select
          value={instructions.communication}
          onChange={(e) =>
            change(
              "communication",
              e.target.value as AIInstruction["communication"],
            )
          }
        >
          {["Simple", "Detailed", "Expert"].map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
      <label className="field-label">
        Notifications
        <select
          value={instructions.notifications}
          onChange={(e) =>
            change(
              "notifications",
              e.target.value as AIInstruction["notifications"],
            )
          }
        >
          {["Only important", "Daily summary", "Everything"].map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
      <label className="field-label">
        Decision style
        <select
          value={instructions.decisions}
          onChange={(e) =>
            change("decisions", e.target.value as AIInstruction["decisions"])
          }
        >
          {["Careful", "Balanced", "Aggressive growth"].map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
      <details className="advanced-preferences">
        <summary>More control</summary>
        <div>
          <p>How much can your team do?</p>
          <Tabs
            options={["Copilot", "Assisted", "Autopilot"]}
            value={mode}
            onChange={(value) => setMode(value as AutonomyMode)}
          />
          <p className="muted">
            Ad limits, refunds, and the rest of your boundaries live together in
            Control Center.
          </p>
          <Link href="/control-center" className="text-link">
            Set your business rules <ArrowRight size={14} />
          </Link>
        </div>
      </details>
    </>
  );
}
