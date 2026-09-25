import "server-only";
import type { ProviderId } from "@/types/backend";
import type { AIProvider } from "./provider";
import { MockAIProvider } from "./mock-provider";
import { BackendError } from "@/lib/server/errors";
/** Future OpenAIProvider / AnthropicProvider / GoogleProvider implement AIProvider here.
 * Never silently substitute a mock for a requested live provider. */
export function createAIProvider(provider: ProviderId): AIProvider {
  if (provider === "mock") return new MockAIProvider();
  throw new BackendError(
    "PROVIDER_NOT_CONFIGURED",
    "Live AI requires authenticated organizations, secure credentials, consent and usage controls.",
  );
}
