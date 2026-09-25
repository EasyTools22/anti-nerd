"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useDemo } from "@/components/intelligence/demo-provider";
import { useBrain } from "@/components/brain/brain-provider";
export function HealthStrip({ period }: { period: string }) {
  const { approvals } = useDemo();
  const { running } = useBrain();
  const pending = approvals.filter((a) => a.status === "Pending").length;
  const values =
    period === "Today"
      ? ["€321", "12"]
      : period === "7 days"
        ? ["€1,605", "46"]
        : ["€6,420", "184"];
  return (
    <section className="health-strip" aria-label="Business health snapshot">
      <span>{period.toUpperCase()} · SAMPLE SNAPSHOT</span>
      <div>
        <strong>{values[0]}</strong>
        <small>profit</small>
      </div>
      <div>
        <strong>{values[1]}</strong>
        <small>orders</small>
      </div>
      <div>
        <strong>{running ? "Previewing" : "Ready"}</strong>
        <small>Anti-Nerd</small>
      </div>
      <Link href="/control-center">
        <strong>{pending}</strong> decisions need you <ArrowUpRight size={15} />
      </Link>
    </section>
  );
}
