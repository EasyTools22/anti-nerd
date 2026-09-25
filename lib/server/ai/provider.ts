import "server-only";
import type {
  ActionProposal,
  ProviderCapabilities,
  ProviderId,
  ToolDefinition,
} from "@/types/backend";
import type { BrainContext } from "@/lib/server/brain/context";
/** Vendor-neutral input. There is deliberately no integration credential or transport. */
export interface AIRequest {
  request: string;
  context: BrainContext;
  modelPreference: string | null;
  maxOutputTokens: number;
  signal?: AbortSignal;
}
export interface AIProvider {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;
  generateText(request: AIRequest): Promise<{ text: string }>;
  /** Decision summary, not private chain-of-thought. */
  reason(
    request: AIRequest,
  ): Promise<{ summary: string; uncertainties: string[] }>;
  structuredOutput<T>(
    request: AIRequest,
    schema: {
      name: string;
      jsonSchema: Record<string, unknown>;
      parse: (raw: unknown) => T;
    },
  ): Promise<T>;
  /** Returns proposals only. Tool execution is owned by Anti-Nerd. */
  toolUse(
    request: AIRequest,
    tools: readonly ToolDefinition[],
  ): Promise<unknown[]>;
  vision?(
    request: AIRequest,
    image: { mimeType: "image/png" | "image/jpeg"; bytes: Uint8Array },
  ): Promise<{ text: string }>;
}
export type ValidatedProviderProposal = ActionProposal;
