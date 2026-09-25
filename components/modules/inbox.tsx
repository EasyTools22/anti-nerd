"use client";
import { useState } from "react";
import { Check, Mail, MessageCircle, Send, Sparkles, X } from "lucide-react";
import {
  Badge,
  PageHeading,
  SearchField,
  useFeedback,
} from "@/components/ui/primitives";
const conversations = [
  {
    name: "Emma de Vries",
    channel: "Email",
    subject: "A quick update on my order",
    message:
      "Hi! I placed an order a few days ago and was wondering when it might arrive. Could you check for me?",
    time: "10:42",
    order: "83921",
  },
  {
    name: "Lucas Bakker",
    channel: "WhatsApp",
    subject: "Finding the right size",
    message:
      "Hello! Is the essential overshirt true to size? I usually wear a medium.",
    time: "10:28",
    order: "83920",
  },
  {
    name: "Sophie Jansen",
    channel: "Website",
    subject: "A question about returns",
    message:
      "I love the quality, but would like to exchange my tote for another color. Is that possible?",
    time: "09:54",
    order: "83919",
  },
  {
    name: "Noah Visser",
    channel: "Email",
    subject: "Thank you for your help!",
    message: "The package arrived today. Everything looks great. Thank you!",
    time: "09:30",
    order: "83918",
  },
  {
    name: "Olivia Smit",
    channel: "WhatsApp",
    subject: "Shipping to Belgium",
    message:
      "Do you deliver to Belgium? I would like to order the signature knit.",
    time: "09:12",
    order: "83917",
  },
];
const suggestions = [
  "Hi Emma, thanks for reaching out! Your order #83921 is taking a little longer than expected. We’re checking its progress and will share an update as soon as we have a confirmed delivery date. Thank you for your patience!",
  "Hi Lucas! The essential overshirt has a relaxed fit. If you usually wear a medium, that should be a comfortable choice. Happy to help with measurements!",
  "Hi Sophie, we’d be happy to help you explore an exchange. Could you share which color you would prefer? We’ll check availability for you.",
  "Hi Noah, that’s wonderful to hear! Thanks for letting us know. Enjoy your new pieces!",
  "Hi Olivia, thanks for your interest! Let me check delivery availability and shipping costs for your address in Belgium.",
];
export function InboxPage() {
  const [selected, setSelected] = useState(0);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState(suggestions);
  const [states, setStates] = useState<Record<number, string>>({});
  const { notify } = useFeedback();
  const convo = conversations[selected];
  return (
    <>
      <PageHeading
        title="Inbox"
        description="Email, WhatsApp, and website conversations. All in one place."
      >
        <Badge>5 conversations · Demo inbox</Badge>
      </PageHeading>
      <div className="inbox">
        <aside className="conversation-list">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search conversations…"
          />
          {conversations.map(
            (c, i) =>
              c.name.toLowerCase().includes(query.toLowerCase()) && (
                <button
                  className={`conversation ${selected === i ? "selected" : ""}`}
                  key={c.name}
                  onClick={() => {
                    setSelected(i);
                    setEditing(false);
                  }}
                >
                  <div>
                    <strong>{c.name}</strong>
                    <small>{c.time}</small>
                  </div>
                  <span>{c.subject}</span>
                  <small>
                    {c.channel} · {states[i] || "Needs approval"}
                  </small>
                </button>
              ),
          )}
        </aside>
        <section className="conversation-main">
          <div className="conversation-heading">
            <span className="avatar">
              {convo.name
                .split(" ")
                .map((v) => v[0])
                .join("")}
            </span>
            <div>
              <h3>{convo.name}</h3>
              <p>
                {convo.channel === "Email" ? (
                  <Mail size={12} />
                ) : (
                  <MessageCircle size={12} />
                )}{" "}
                {convo.channel}
              </p>
            </div>
            <Badge tone="amber">{states[selected] || "Needs approval"}</Badge>
          </div>
          <div className="messages">
            <span className="message-date">Today, September 24</span>
            <div className="message-bubble">
              {convo.message}
              <small>{convo.time}</small>
            </div>
            <div className="suggestion">
              <h3>
                <Sparkles size={17} /> AI suggested response
              </h3>
              {editing ? (
                <textarea
                  aria-label="Edit suggested response"
                  value={drafts[selected]}
                  onChange={(e) =>
                    setDrafts(
                      drafts.map((d, i) =>
                        i === selected ? e.target.value : d,
                      ),
                    )
                  }
                />
              ) : (
                <p>{drafts[selected]}</p>
              )}
              <div className="button-row">
                <button
                  className="button primary"
                  disabled={!!states[selected] || !drafts[selected].trim()}
                  onClick={() => {
                    setStates({ ...states, [selected]: "Approved" });
                    setEditing(false);
                    notify("Reply approved in this demo. Nothing was sent.");
                  }}
                >
                  <Check size={15} />
                  Approve
                </button>
                <button
                  className="button"
                  disabled={!!states[selected]}
                  onClick={() => setEditing(!editing)}
                >
                  {editing ? "Done editing" : "Edit"}
                </button>
                <button
                  className="icon-button"
                  aria-label="Reject suggestion"
                  disabled={!!states[selected]}
                  onClick={() => {
                    setStates({ ...states, [selected]: "Rejected" });
                    notify("Suggestion rejected for this demo session.");
                  }}
                >
                  <X size={17} />
                </button>
              </div>
            </div>
            <p className="demo-caption">
              Approval is simulated. Messages are never sent.
            </p>
          </div>
          <div className="composer">
            <Send size={16} />
            <span>Connect your channels to start sending replies.</span>
          </div>
        </section>
        <aside className="customer-context">
          <h3>Customer details</h3>
          <span className="avatar large">
            {convo.name
              .split(" ")
              .map((v) => v[0])
              .join("")}
          </span>
          <h3>{convo.name}</h3>
          <Badge>Returning customer</Badge>
          <div className="detail-row">
            <span>Orders</span>
            <strong>4</strong>
          </div>
          <div className="detail-row">
            <span>Lifetime value</span>
            <strong>€749</strong>
          </div>
          <h3>Latest order</h3>
          <p>#{convo.order}</p>
          <Badge tone="gray">Sample order</Badge>
          <div className="insight">
            <strong>A little context</strong>
            <p>This customer appreciates a personal, friendly response.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
