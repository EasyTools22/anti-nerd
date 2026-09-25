import "server-only";
import type {
  Capability,
  IntegrationId,
  ReadToolCall,
  ReadToolName,
  ToolOutputs,
} from "@/types/backend";
/** Agent/runtime never receives a transport, token or arbitrary-query method. */
export interface IntegrationAdapter<
  TCall = ReadToolCall,
  TResult = ToolOutputs[ReadToolName],
> {
  readonly integration: IntegrationId;
  readonly source: "mock" | "live";
  readonly organizationId: string;
  readonly capabilities: readonly Capability[];
  executeRead(call: TCall): Promise<TResult>;
}
