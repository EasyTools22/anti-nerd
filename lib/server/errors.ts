import "server-only";
export class BackendError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "BackendError";
  }
}
export const pending = () =>
  new BackendError(
    "FOUNDATION_PENDING",
    "Authentication and durable secret, policy and audit storage are not configured.",
  );
