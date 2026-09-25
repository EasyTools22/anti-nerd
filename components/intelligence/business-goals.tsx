"use client";
import { Check, Plus, Target, X } from "lucide-react";
import { businessGoals } from "@/lib/mock-data/intelligence";
import { useDemo } from "./demo-provider";
import { Card } from "@/components/ui/primitives";
import { ReorderButtons } from "@/components/ui/reorder-buttons";
import { moveItem } from "@/lib/flows/demo-builder";
export function BusinessGoals() {
  const { goals, setGoals } = useDemo();
  return (
    <Card
      title="What matters most to you?"
      subtitle="Pick your goals. Put the most important one first."
    >
      <div className="business-goals-content">
        <div className="goal-choices">
          {businessGoals.map((goal) => (
            <button
              key={goal.id}
              className={`goal-choice ${goals.includes(goal.id) ? "selected" : ""}`}
              aria-pressed={goals.includes(goal.id)}
              title={goal.description}
              onClick={() =>
                setGoals((current) =>
                  current.includes(goal.id)
                    ? current.filter((id) => id !== goal.id)
                    : [...current, goal.id],
                )
              }
            >
              {goals.includes(goal.id) ? (
                <Check size={14} />
              ) : (
                <Plus size={14} />
              )}{" "}
              {goal.label}
            </button>
          ))}
        </div>
        <div className="goal-priorities" aria-label="Goal priority order">
          {goals.length ? (
            goals.map((id, index) => {
              const goal = businessGoals.find((item) => item.id === id)!;
              return (
                <div className="goal-priority" key={id}>
                  <span className="goal-rank">#{index + 1}</span>
                  <div>
                    <strong>{goal.label}</strong>
                    <p>{goal.description}</p>
                  </div>
                  <ReorderButtons
                    label={goal.label}
                    index={index}
                    count={goals.length}
                    onMove={(target) =>
                      setGoals((current) => moveItem(current, index, target))
                    }
                  />
                  <button
                    className="icon-button"
                    aria-label={`Remove ${goal.label}`}
                    onClick={() =>
                      setGoals((current) =>
                        current.filter((item) => item !== id),
                      )
                    }
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="empty">
              <Target size={24} />
              <h3>What should come first?</h3>
              <p>Choose a goal above to start your priority list.</p>
            </div>
          )}
        </div>
        <p className="control-caption">
          Your priorities stay in this demo session. They don’t change any real
          recommendations yet.
        </p>
      </div>
    </Card>
  );
}
