"use client";
import { useState } from "react";
import { ArrowUpRight, Package } from "lucide-react";
import { orders, products, money } from "@/lib/mock-data/business";
import type { Order } from "@/types/business";
import {
  Badge,
  Card,
  EmptyState,
  Modal,
  PageHeading,
  SearchField,
  useFeedback,
} from "@/components/ui/primitives";
export function OrdersPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All orders");
  const [selected, setSelected] = useState<Order | null>(null);
  const filtered = orders.filter(
    (o) =>
      `${o.id} ${o.customer}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All orders" || o.fulfillment === filter),
  );
  return (
    <>
      <PageHeading
        title="Orders"
        description="Every purchase, from checkout to your customer’s doorstep."
      >
        <Badge tone="gray">12 sample orders</Badge>
      </PageHeading>
      <Card>
        <div className="table-toolbar">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search order or customer…"
          />
          <select
            aria-label="Fulfillment filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {["All orders", "Delivered", "Processing", "Delayed"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Order",
                  "Customer",
                  "Amount",
                  "Payment",
                  "Fulfillment",
                  "Source",
                  "Date",
                  "",
                ].map((v, i) => (
                  <th key={i}>{v}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td>
                    <button
                      className="table-link"
                      onClick={() => setSelected(o)}
                    >
                      #{o.id}
                    </button>
                  </td>
                  <td>
                    <strong>{o.customer}</strong>
                    <small>{o.email}</small>
                  </td>
                  <td>{money(o.amount)}</td>
                  <td>
                    <Badge tone={o.status === "Paid" ? "green" : "gray"}>
                      {o.status}
                    </Badge>
                  </td>
                  <td>
                    <Badge
                      tone={o.fulfillment === "Delayed" ? "amber" : "gray"}
                    >
                      {o.fulfillment}
                    </Badge>
                  </td>
                  <td>{o.source}</td>
                  <td>{o.date}</td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`View order ${o.id}`}
                      onClick={() => setSelected(o)}
                    >
                      <ArrowUpRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && <EmptyState />}
        <div className="table-foot">
          Showing {filtered.length} of {orders.length} orders · Sample data
        </div>
      </Card>
      {selected && (
        <Modal
          title={`Order #${selected.id}`}
          onClose={() => setSelected(null)}
        >
          <Badge tone={selected.fulfillment === "Delayed" ? "amber" : "green"}>
            {selected.fulfillment}
          </Badge>
          <h3>{selected.customer}</h3>
          <p>{selected.email}</p>
          <div className="detail-row">
            <span>Order total</span>
            <strong>{money(selected.amount)}</strong>
          </div>
          <div className="detail-row">
            <span>Source</span>
            <span>{selected.source}</span>
          </div>
          <div className="detail-row">
            <span>Placed</span>
            <span>{selected.date}</span>
          </div>
          <div className="insight">
            <strong>AI order insight · Preview</strong>
            <p>
              {selected.fulfillment === "Delayed"
                ? "This shipment is behind schedule. A proactive customer update is recommended."
                : "No issues identified in this sample order."}
            </p>
          </div>
          <p className="muted">
            Live tracking and item-level details will appear when your store is
            connected.
          </p>
        </Modal>
      )}
    </>
  );
}
export function CustomersPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All customers");
  const filtered = orders.filter(
    (o, i) =>
      o.customer.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All customers" ||
        (filter === "VIP" ? i % 3 === 0 : i % 3 !== 0)),
  );
  return (
    <>
      <PageHeading
        title="Customers"
        description="Get to know the people behind every purchase."
      />
      <Card>
        <div className="table-toolbar">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search customers…"
          />
          <select
            aria-label="Customer status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>All customers</option>
            <option>VIP</option>
            <option>Returning</option>
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Customer",
                  "Total orders",
                  "Lifetime value",
                  "Last order",
                  "Status",
                  "Satisfaction",
                ].map((v) => (
                  <th key={v}>{v}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const i = orders.indexOf(o);
                return (
                  <tr key={o.id}>
                    <td>
                      <div className="person">
                        <span className="avatar">
                          {o.customer
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <span>
                          <strong>{o.customer}</strong>
                          <small>{o.email}</small>
                        </span>
                      </div>
                    </td>
                    <td>{i + 2}</td>
                    <td>{money(o.amount * (i + 2))}</td>
                    <td>{o.date}</td>
                    <td>
                      <Badge tone={i % 3 === 0 ? "green" : "gray"}>
                        {i % 3 === 0 ? "VIP" : "Returning"}
                      </Badge>
                    </td>
                    <td>
                      <span className="satisfaction">●</span>{" "}
                      {i === 4 ? "Needs care" : "Happy"} ·{" "}
                      {i === 4 ? "72" : "96"}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!filtered.length && <EmptyState />}
      </Card>
    </>
  );
}
export function ProductsPage() {
  const [query, setQuery] = useState("");
  const { preview } = useFeedback();
  return (
    <>
      <PageHeading
        title="Products"
        description="Your collection, with every detail in its place."
      />
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Search products…"
      />
      <div className="product-grid">
        {products
          .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
          .map((p, i) => (
            <Card key={p.name}>
              <div className={`product-art art-${i}`}>
                <Package size={64} strokeWidth={0.8} />
                <span>WK EXCLUSIVE</span>
              </div>
              <div className="product-info">
                <Badge tone={p.stock < 10 ? "amber" : "green"}>
                  {p.stock < 10 ? "Low stock" : "In stock"}
                </Badge>
                <h3>{p.name}</h3>
                <p>
                  {p.category} · {p.stock} available
                </p>
                <div className="detail-row">
                  <strong>{money(p.price)}</strong>
                  <button
                    className="text-link"
                    onClick={() => preview("Product editing")}
                  >
                    View product <ArrowUpRight size={15} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
      </div>
    </>
  );
}
