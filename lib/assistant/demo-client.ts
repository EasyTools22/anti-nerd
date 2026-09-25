import type { AssistantClient } from "@/types/assistant";
import { assistantExamples } from "@/lib/mock-data/assistant";
/** Local-only adapter. Replace at the boundary when a server-backed assistant is authorized. */
export const demoAssistant: AssistantClient = {
  async reply(prompt) {
    const example = assistantExamples.find(
      (item) => item.prompt.toLowerCase() === prompt.trim().toLowerCase(),
    );
    return (
      example?.reply ?? {
        source: "demo",
        sources: ["No business sources used · Unmatched demo question"],
        text: "I’m a preview of your future Anti-Nerd assistant. I haven’t analyzed your question or accessed any business data. Try one of the sample questions to see how explanations and suggested next steps will work. Nothing is sent to an AI service.",
      }
    );
  },
};
