import "server-only";
import type { ProviderId, IntegrationConnection } from "@/types/backend";
import { pending } from "@/lib/server/errors";
export type CredentialPurpose = `ai:${ProviderId}` | "integration:shopify";
/** Storage adapter must use authenticated encryption / managed KMS and tenant-bound AAD. */
export interface ProviderCredential {
  id: string;
  organizationId: string;
  purpose: CredentialPurpose;
  encryptedPayload: string;
  keyVersion: string;
  createdAt: string;
  rotatedAt: string | null;
}
export interface CredentialStore {
  readonly persistence: "durable" | "pending";
  save(
    organizationId: string,
    purpose: CredentialPurpose,
    secret: string,
  ): Promise<string>;
  withSecret<T>(
    organizationId: string,
    reference: string,
    purpose: CredentialPurpose,
    use: (secret: string) => Promise<T>,
  ): Promise<T>;
  revoke(organizationId: string, reference: string): Promise<void>;
}
/** Deliberately no memory/file/localStorage fallback for real credentials. */
export class UnconfiguredCredentialStore implements CredentialStore {
  readonly persistence = "pending" as const;
  async save(): Promise<string> {
    throw pending();
  }
  async withSecret<T>(): Promise<T> {
    throw pending();
  }
  async revoke(): Promise<void> {
    throw pending();
  }
}
export interface StoredIntegrationConnection extends IntegrationConnection {
  credentialReference: string;
}
export interface ConnectionRepository {
  get(
    organizationId: string,
    connectionId: string,
  ): Promise<StoredIntegrationConnection | null>;
}
/** Must be constructed from verified session + membership, never from a request body/header. */
export interface ExecutionContext {
  organizationId: string;
  actorId: string;
  role: "owner" | "admin" | "member" | "viewer";
  source: "mock" | "live";
}
