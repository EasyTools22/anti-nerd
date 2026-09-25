import Link from "next/link";
import { pageWorkspace } from "@/lib/server/auth/context";
import { WorkspaceRepository } from "@/lib/server/db/workspace";
import { DurableApprovals } from "@/components/workspace/approvals";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ before?: string; last?: string }>;
}) {
  const context = await pageWorkspace();
  const { before, last } = await searchParams;
  const valid =
    before &&
    /^[0-9T:.+Z-]{20,40}$/.test(before) &&
    Number.isFinite(Date.parse(before))
      ? before
      : undefined;
  const cursor = last && /^[0-9a-f-]{36}$/i.test(last) ? last : undefined;
  const events = await new WorkspaceRepository(context).audit(valid, cursor);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Activity</h1>
          <p className="muted">
            Your workspace’s durable approval and audit history.
          </p>
        </div>
      </div>
      <DurableApprovals context={context} />
      <section className="card durable-panel">
        <h2>Audit history</h2>
        <p className="muted">
          Your saved history. Connected Shopify reads and demo activity are
          labeled separately.
        </p>
        {events.length ? (
          events.map((event) => (
            <article className="detail-row" key={event.id}>
              <div>
                <strong>{event.action_type}</strong>
                <p>{event.reason}</p>
                <small>
                  {event.resource} · {new Date(event.created_at).toISOString()}
                </small>
              </div>
              <span>
                {event.result.replaceAll("_", " ")} · {event.source}
              </span>
            </article>
          ))
        ) : (
          <p>No audit events yet.</p>
        )}
        {events.length === 50 && (
          <Link
            className="text-link"
            href={`/activity?before=${encodeURIComponent(events[events.length - 1].created_at)}&last=${events[events.length - 1].id}`}
          >
            Older activity
          </Link>
        )}
      </section>
    </>
  );
}
