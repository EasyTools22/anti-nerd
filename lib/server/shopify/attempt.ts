import "server-only";
import { persistenceClient, databaseError } from "../db/client";
import { BackendError } from "../errors";
import { resolveWorkspace, selectWorkspace } from "../auth/context";
import { digestState } from "./protocol";

/** The proof comes only from the HttpOnly nonce cookie, never a query/body ID. */
export async function restoreAttempt(
  actorId: string,
  browserState: string | undefined,
) {
  if (!browserState || !/^[a-f0-9]{64}$/.test(browserState))
    throw new BackendError("INVALID_STATE", "Start a new Shopify connection.");
  const { data, error } = await persistenceClient().rpc(
    "shopify_oauth_context",
    {
      state_digest: digestState(browserState),
      actor: actorId,
      operation: "lookup",
    },
  );
  databaseError(error);
  if (!data || data.actorId !== actorId)
    throw new BackendError("INVALID_STATE", "Start a new Shopify connection.");
  const context = await resolveWorkspace(data.organizationId, data.businessId);
  if (!context || context.actorId !== actorId || context.role !== "owner")
    throw new BackendError(
      "NOT_AUTHORIZED",
      "This business is no longer available.",
    );
  // Rechecks membership, records selection, then persists host-only Lax cookies.
  // Also restore on recoverable failure so retry is offered for the correct business.
  await selectWorkspace(context.organizationId, context.businessId);
  return context;
}

/** Cancel only this authenticated actor's pending nonce. Does not touch active credentials.
 * Consumed unexpired attempts are protected from concurrent/replayed callbacks by SQL. */
export async function cancelAttempt(
  actorId: string,
  browserState: string | undefined,
) {
  if (!browserState || !/^[a-f0-9]{64}$/.test(browserState)) return;
  const { error } = await persistenceClient().rpc("shopify_oauth_context", {
    state_digest: digestState(browserState),
    actor: actorId,
    operation: "cancel",
  });
  databaseError(error);
}
