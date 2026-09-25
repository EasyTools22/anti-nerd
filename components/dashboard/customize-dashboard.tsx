"use client";
import { RotateCcw } from "lucide-react";
import { useMotionPreference } from "@/lib/hooks/use-reduced-motion";
import { useDemo } from "@/components/intelligence/demo-provider";
import {
  dashboardLabels,
  defaultDashboard,
} from "@/lib/mock-data/intelligence";
import { Modal, Tabs } from "@/components/ui/primitives";
import { ReorderButtons } from "@/components/ui/reorder-buttons";
import { moveItem } from "@/lib/flows/demo-builder";
export function CustomizeDashboard({ onClose }: { onClose: () => void }) {
  const { dashboard, setDashboard } = useDemo();
  const { reduce, setReduce } = useMotionPreference();
  return (
    <Modal title="Make this dashboard yours" onClose={onClose}>
      <p className="muted">
        Keep what matters. Move things into the order that works for you.
        Changes last for this demo session.
      </p>
      <div className="dashboard-density">
        <span>View</span>
        <Tabs
          options={["Comfortable", "Compact"]}
          value={dashboard.density === "compact" ? "Compact" : "Comfortable"}
          onChange={(value) =>
            setDashboard((current) => ({
              ...current,
              density: value === "Compact" ? "compact" : "comfortable",
            }))
          }
        />
      </div>
      <label className="motion-preference">
        <span>
          Reduce motion
          <small>
            Stops autoplay and uses simple transitions. Your device preference
            is always respected.
          </small>
        </span>
        <input
          type="checkbox"
          checked={reduce}
          onChange={(event) => setReduce(event.target.checked)}
        />
      </label>
      <div className="dashboard-options">
        {dashboard.order.map((id, index) => (
          <div className="dashboard-option" key={id}>
            <label>
              <input
                type="checkbox"
                checked={!dashboard.hidden.includes(id)}
                onChange={(e) =>
                  setDashboard((current) => ({
                    ...current,
                    hidden: e.target.checked
                      ? current.hidden.filter((section) => section !== id)
                      : [...current.hidden, id],
                  }))
                }
              />
              {dashboardLabels[id]}
            </label>
            <ReorderButtons
              label={dashboardLabels[id]}
              index={index}
              count={dashboard.order.length}
              onMove={(target) =>
                setDashboard((current) => ({
                  ...current,
                  order: moveItem(current.order, index, target),
                }))
              }
            />
          </div>
        ))}
      </div>
      <p className="muted">
        The working status stays visible so your team is always easy to find.
      </p>
      <div className="button-row">
        <button
          className="button"
          onClick={() => setDashboard(defaultDashboard)}
        >
          <RotateCcw size={14} />
          Reset layout
        </button>
        <button className="button primary" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}
