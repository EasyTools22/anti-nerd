import "server-only";
import { createHash } from "node:crypto";
import { persistenceClient, databaseError } from "../db/client";
import { BackendError } from "../errors";
export interface RateLimiter {
  consume(
    scope: "auth" | "approval" | "mutation",
    subject: string,
  ): Promise<void>;
}
export class PostgresRateLimiter implements RateLimiter {
  async consume(scope: "auth" | "approval" | "mutation", subject: string) {
    const bucket = createHash("sha256")
      .update(subject.toLowerCase().trim())
      .digest("hex");
    const { data, error } = await persistenceClient().rpc(
      "consume_rate_limit",
      { bucket_key: bucket, scope },
    );
    databaseError(error);
    if (data !== true)
      throw new BackendError(
        "RATE_LIMITED",
        "Please wait before trying again.",
      );
  }
}
export const rateLimiter = new PostgresRateLimiter();
