"use client";
import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import type { BusinessRule } from "@/types/intelligence";
import { useDemo } from "./demo-provider";
import { Badge, Card, useFeedback } from "@/components/ui/primitives";
import { MetricLabel } from "@/components/ui/metric-label";
const toValues = (rules: BusinessRule[]) =>
  Object.fromEntries(
    rules.map((rule) => [
      rule.id,
      rule.kind === "toggle" ? rule.value : String(rule.value),
    ]),
  );
export function BusinessRules() {
  const { rules, setRules } = useDemo();
  const [values, setValues] = useState<Record<string, string | boolean>>(() =>
    toValues(rules),
  );
  const { notify } = useFeedback();
  const dirty = rules.some(
    (rule) =>
      values[rule.id] !==
      (rule.kind === "toggle" ? rule.value : String(rule.value)),
  );
  return (
    <Card
      title="Your rules"
      subtitle="Clear boundaries. Fewer surprises."
      action={
        <Badge tone={dirty ? "amber" : "gray"}>
          {dirty ? "Unsaved edits" : "Demo boundaries"}
        </Badge>
      }
    >
      <form
        className="business-rules-form"
        onSubmit={(event) => {
          event.preventDefault();
          setRules((current) =>
            current.map((rule) =>
              rule.kind === "number"
                ? { ...rule, value: Number(values[rule.id]) }
                : rule.kind === "toggle"
                  ? { ...rule, value: Boolean(values[rule.id]) }
                  : { ...rule, value: String(values[rule.id]) },
            ),
          );
          notify(
            "Your rules are saved for this demo session. No actions will run.",
          );
        }}
      >
        {(["Ads", "Customer service", "Pricing", "Finance"] as const).map(
          (category, index) => (
            <details
              className="rule-category"
              key={category}
              open={index === 0 ? true : undefined}
            >
              <summary>
                <span>
                  <ShieldCheck size={16} />
                  {category}
                </span>
                <small>
                  {rules.filter((rule) => rule.category === category).length}{" "}
                  boundaries
                </small>
              </summary>
              <div>
                {rules
                  .filter((rule) => rule.category === category)
                  .map((rule) => (
                    <div className="business-rule" key={rule.id}>
                      <div>
                        <label htmlFor={`rule-${rule.id}`}>
                          {rule.id === "roas" ? (
                            <MetricLabel label={rule.label} term="ROAS" />
                          ) : (
                            rule.label
                          )}
                        </label>
                        <p>{rule.help}</p>
                      </div>
                      {rule.kind === "number" ? (
                        <div className="rule-number">
                          <span>{rule.unit === "€" ? "€" : ""}</span>
                          <input
                            id={`rule-${rule.id}`}
                            type="number"
                            min={rule.min}
                            max={rule.max}
                            step={rule.step}
                            required
                            value={String(values[rule.id])}
                            onChange={(e) =>
                              setValues((current) => ({
                                ...current,
                                [rule.id]: e.target.value,
                              }))
                            }
                          />
                          <span>{rule.unit !== "€" ? rule.unit : ""}</span>
                        </div>
                      ) : rule.kind === "toggle" ? (
                        <button
                          id={`rule-${rule.id}`}
                          type="button"
                          role="switch"
                          aria-checked={Boolean(values[rule.id])}
                          className={`toggle ${values[rule.id] ? "on" : ""}`}
                          onClick={() =>
                            setValues((current) => ({
                              ...current,
                              [rule.id]: !current[rule.id],
                            }))
                          }
                        >
                          <span />
                        </button>
                      ) : (
                        <select
                          id={`rule-${rule.id}`}
                          value={String(values[rule.id])}
                          onChange={(e) =>
                            setValues((current) => ({
                              ...current,
                              [rule.id]: e.target.value,
                            }))
                          }
                        >
                          {rule.options.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
              </div>
            </details>
          ),
        )}
        <div className="rules-save">
          <span className="muted">
            Nothing is connected. These rules are a preview.
          </span>
          <button
            className="button"
            type="button"
            disabled={!dirty}
            onClick={() => setValues(toValues(rules))}
          >
            Reset edits
          </button>
          <button className="button primary" type="submit" disabled={!dirty}>
            <Check size={14} />
            Save rules
          </button>
        </div>
      </form>
    </Card>
  );
}
