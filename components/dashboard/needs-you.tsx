import Link from "next/link";
import { ArrowUpRight, CircleAlert } from "lucide-react";
import { ApprovalCenter } from "@/components/intelligence/approval-card";
import { Badge } from "@/components/ui/primitives";
import { attentionItems } from "@/lib/mock-data/dashboard";
export function NeedsYou() {
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>
            Needs you <Badge tone="amber">Your next decisions</Badge>
          </h2>
          <p>The important stuff stays in your hands.</p>
        </div>
        <Link href="/control-center">
          Your rules <ArrowUpRight size={14} />
        </Link>
      </div>
      <ApprovalCenter />
      <details className="attention-disclosure">
        <summary>
          <span>
            <CircleAlert size={16} />4 other things to check
          </span>
          <small>Orders, replies & stock</small>
        </summary>
        {attentionItems.map((item) => (
          <div className="attention-row" key={item.href}>
            <div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
            <Link href={item.href} className="text-link">
              {item.action}
              <ArrowUpRight size={14} />
            </Link>
          </div>
        ))}
      </details>
    </>
  );
}
