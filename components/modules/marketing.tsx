"use client";
import { useState } from "react";
import {
  ArrowRight,
  Mail,
  Plus,
  Tag,
  TicketPercent,
  Users,
  Workflow,
} from "lucide-react";
import {
  Badge,
  Card,
  Modal,
  PageHeading,
  Tabs,
  useFeedback,
} from "@/components/ui/primitives";
import {
  marketingCampaigns,
  marketingModules,
} from "@/lib/mock-data/product-shell";
const icons = [Mail, Workflow, Users, Tag, TicketPercent];
export function MarketingPage() {
  const [status, setStatus] = useState("All campaigns");
  const [detail, setDetail] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const { preview } = useFeedback();
  return (
    <>
      <PageHeading
        title="Marketing"
        description="Turn a first purchase into a lasting relationship."
      >
        <button
          className="button primary"
          onClick={() => preview("Create campaign")}
        >
          <Plus size={15} />
          Create campaign
        </button>
      </PageHeading>
      <div className="overview-note">
        <span>
          <span className="live-dot" />A preview of your future marketing
          workspace.
        </span>
        <span>
          All campaigns, audiences, and results below are sample data.
        </span>
      </div>
      <div className="three-grid marketing-modules">
        {marketingModules.map((module, i) => {
          const Icon = icons[i];
          return (
            <Card key={module.name}>
              <div className="product-info">
                <div className="detail-row">
                  <span className={`agent-icon tone-${i}`}>
                    <Icon size={21} />
                  </span>
                  <Badge tone="gray">Coming later</Badge>
                </div>
                <h3>{module.name}</h3>
                <p>{module.description}</p>
                <button
                  className="text-link"
                  onClick={() =>
                    setDetail({
                      title: module.name,
                      description: module.detail,
                    })
                  }
                >
                  Explore preview <ArrowRight size={14} />
                </button>
              </div>
            </Card>
          );
        })}
      </div>
      <Card
        title="Your campaigns"
        subtitle="From a first draft to a friendly follow-up. This is a demo, not a sending tool."
      >
        <div className="table-toolbar">
          <Tabs
            options={["All campaigns", "Draft", "Scheduled", "Sent"]}
            value={status}
            onChange={setStatus}
          />
          <Badge tone="gray">Sample campaigns</Badge>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Campaign",
                  "Audience",
                  "Channel",
                  "Status",
                  "Date",
                  "Recipients",
                  "Orders",
                ].map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {marketingCampaigns
                .filter(
                  (campaign) =>
                    status === "All campaigns" || campaign.status === status,
                )
                .map((campaign) => (
                  <tr key={campaign.id}>
                    <td>
                      <button
                        className="table-link"
                        onClick={() =>
                          setDetail({
                            title: campaign.name,
                            description: `This sample ${campaign.channel.toLowerCase()} is for ${campaign.audience.toLowerCase()}. The ${campaign.status.toLowerCase()} status and ${campaign.recipients.toLocaleString("en-GB")} recipients illustrate a future campaign. Nothing has been scheduled or sent.`,
                          })
                        }
                      >
                        {campaign.name}
                      </button>
                    </td>
                    <td>{campaign.audience}</td>
                    <td>{campaign.channel}</td>
                    <td>
                      <Badge
                        tone={
                          campaign.status === "Sent"
                            ? "green"
                            : campaign.status === "Scheduled"
                              ? "amber"
                              : "gray"
                        }
                      >
                        {campaign.status} · Demo
                      </Badge>
                    </td>
                    <td>{campaign.date}</td>
                    <td>{campaign.recipients.toLocaleString("en-GB")}</td>
                    <td>
                      {campaign.status === "Sent" ? campaign.orders : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
      {detail && (
        <Modal title={detail.title} onClose={() => setDetail(null)}>
          <Badge tone="gray">Marketing preview</Badge>
          <p>{detail.description}</p>
          <button className="button primary" onClick={() => setDetail(null)}>
            Got it
          </button>
        </Modal>
      )}
    </>
  );
}
