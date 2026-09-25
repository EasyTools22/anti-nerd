import "server-only";
import type {
  ActionProposal,
  OrganizationPolicy,
  PolicyDecision,
  PolicyMode,
} from "@/types/backend";
import { toolCatalog } from "@/lib/backend/tool-catalog";
import type { ExecutionContext } from "@/lib/server/security/credentials";
export function evaluatePolicy(
  context: ExecutionContext,
  action: ActionProposal,
  policy: OrganizationPolicy,
): PolicyDecision {
  const definition = toolCatalog[action.tool];
  const rule = policy.rules[definition.capability];
  const mode: PolicyMode =
    rule?.mode ?? (definition.impact === "read" ? "READ_ONLY" : "ASK_FIRST");
  const result = (
    outcome: PolicyDecision["outcome"],
    reason: string,
  ): PolicyDecision => ({
    outcome,
    mode,
    reason,
    policyRevision: policy.revision,
  });
  if (context.organizationId !== policy.organizationId)
    return result("DENY", "Organization mismatch.");
  if (context.role === "viewer" && definition.impact !== "read")
    return result("DENY", "Viewers cannot request changes.");
  switch (mode) {
    case "DENIED":
      return result("DENY", "This capability is disabled by the owner.");
    case "READ_ONLY":
      return definition.impact === "read"
        ? result("ALLOW", "Read access permitted.")
        : result("DENY", "Read-only mode cannot permit a change.");
    case "ASK_FIRST":
      return result(
        "REQUIRE_APPROVAL",
        "The owner must review this exact action.",
      );
    case "AUTOMATIC":
      // Foundation guardrail. A future reviewed policy migration is required to relax this.
      return definition.impact === "high_impact"
        ? result(
            "REQUIRE_APPROVAL",
            "High-impact actions require owner review in this phase.",
          )
        : result(
            "ALLOW",
            "Explicit organization policy permits this capability.",
          );
    case "AUTOMATIC_WITH_LIMITS": {
      const limit = rule?.limits;
      if (definition.impact === "high_impact")
        return result(
          "REQUIRE_APPROVAL",
          "High-impact actions require owner review.",
        );
      if (
        action.tool !== "updateProductPrice" ||
        !limit ||
        Object.keys(limit).some(
          (k) => !["currency", "maxNewPriceMinor"].includes(k),
        ) ||
        !Number.isSafeInteger(limit.maxNewPriceMinor) ||
        limit.maxNewPriceMinor < 0
      )
        return result(
          "DENY",
          "Missing or unsupported limits. No automatic action allowed.",
        );
      if (
        action.input.newPrice.currency !== limit.currency ||
        action.input.currentPrice.currency !== limit.currency ||
        action.input.newPrice.amountMinor > limit.maxNewPriceMinor
      )
        return result(
          "DENY",
          "The proposed price exceeds the configured boundary.",
        );
      return result(
        "ALLOW",
        "Price is within the explicit currency and absolute price limit.",
      );
    }
    default:
      return result("DENY", "Unknown policy mode.");
  }
}
