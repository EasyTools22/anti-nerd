"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUp, MessageCircle, Sparkles } from "lucide-react";
import { Badge, Modal } from "@/components/ui/primitives";
import { assistantExamples } from "@/lib/mock-data/assistant";
import { demoAssistant } from "@/lib/assistant/demo-client";
import type { AssistantClient, AssistantExchange } from "@/types/assistant";
export function AssistantPanel({
  open,
  onClose,
  client = demoAssistant,
}: {
  open: boolean;
  onClose: () => void;
  client?: AssistantClient;
}) {
  const path = usePathname();
  const [mode, setMode] = useState("Ask");
  const contextual =
    path === "/ads"
      ? ["Which ads need attention?", "Why was profit lower yesterday?"]
      : path === "/finance"
        ? ["Why was profit lower yesterday?", "Which ads need attention?"]
        : path === "/brain"
          ? [
              "What does my Business Brain understand?",
              "Which beliefs should I review?",
            ]
          : assistantExamples.slice(-5).map((item) => item.prompt);
  const prompts =
    mode === "Do"
      ? ["Pause losing ads.", "Review decisions needing me."]
      : mode === "Create"
        ? ["Create a promotion for this weekend.", "Make 10 new creatives."]
        : mode === "Analyze"
          ? ["How can I improve my store?", "Why was profit lower yesterday?"]
          : contextual;
  const [input, setInput] = useState("");
  const [exchanges, setExchanges] = useState<AssistantExchange[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const history = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  useEffect(() => {
    history.current?.scrollTo({ top: history.current.scrollHeight });
  }, [exchanges, open]);
  async function ask(question: string) {
    const prompt = question.trim();
    if (!prompt || busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const reply = await client.reply(prompt);
      setExchanges((current) => [
        ...current,
        { id: (current.at(-1)?.id ?? 0) + 1, question: prompt, reply },
      ]);
      setInput("");
    } catch {
      setError("That reply could not be loaded. Please try again.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  if (!open) return null;
  return (
    <Modal title="Ask Anti-Nerd" onClose={onClose} className="assistant-panel">
      <div className="assistant-intro">
        <Link
          href="/brain"
          onClick={onClose}
          className="assistant-brain-source"
        >
          Using your Business Brain · Demo context <ArrowRight size={13} />
        </Link>
        <p>What do you want to know or do?</p>
        <Badge tone="gray">Demo assistant · No AI connected</Badge>
      </div>
      <div ref={history} className="assistant-history">
        <div className="assistant-welcome">
          <span className="agent-icon tone-3">
            <Sparkles size={22} />
          </span>
          <h3>A little clarity. A helpful next step.</h3>
          <p>
            You don’t need to know the right terminology. Just start with what’s
            on your mind.
          </p>
        </div>
        <div className="assistant-modes" aria-label="Assistant intent">
          {["Ask", "Do", "Create", "Analyze"].map((item) => (
            <button
              key={item}
              aria-pressed={item === mode}
              onClick={() => setMode(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="assistant-suggestions" aria-label="Sample questions">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              disabled={pending}
              onClick={() => void ask(prompt)}
            >
              <MessageCircle size={15} />
              <span>{prompt}</span>
              <ArrowRight size={14} />
            </button>
          ))}
        </div>
        <div
          className="assistant-exchanges"
          role="log"
          aria-live="polite"
          aria-label="Demo conversation"
        >
          {exchanges.map((exchange) => (
            <div className="assistant-exchange" key={exchange.id}>
              <div className="assistant-question">{exchange.question}</div>
              <div className="assistant-answer">
                <Badge tone="gray">Mock response</Badge>
                <p>{exchange.reply.text}</p>
                <small className="assistant-sources">
                  Based on:{" "}
                  {(
                    exchange.reply.sources ?? [
                      "Business Brain",
                      "Sample business records",
                    ]
                  ).join(" · ")}
                </small>
                {exchange.reply.nextStep && (
                  <Link
                    className="text-link"
                    href={exchange.reply.nextStep.href}
                    onClick={onClose}
                  >
                    {exchange.reply.nextStep.label}
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
        {pending && (
          <p className="muted" role="status">
            Preparing your preview…
          </p>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
      <form
        className="assistant-composer"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(input);
        }}
      >
        <label className="sr-only" htmlFor="assistant-question">
          Ask anything about your business
        </label>
        <div>
          <input
            id="assistant-question"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask anything about your business..."
            maxLength={1000}
            autoComplete="off"
          />
          <button
            className="button primary"
            disabled={!input.trim() || pending}
            aria-label="Ask demo assistant"
            type="submit"
          >
            <ArrowUp size={18} />
          </button>
        </div>
        <p>Sample responses only. No business actions are performed.</p>
      </form>
    </Modal>
  );
}
