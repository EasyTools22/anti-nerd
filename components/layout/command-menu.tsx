"use client";
import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Search, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/primitives";
import { navigation } from "@/lib/navigation";
const actions = [
  { name: "Find customer", href: "/customers" },
  { name: "Open campaign", href: "/ads" },
  { name: "Create product · Preview", href: "/products" },
  { name: "Analyze profit", href: "/finance" },
  { name: "Build flow", href: "/flows" },
  { name: "Research product", href: "/research" },
  { name: "Open Business Brain", href: "/brain" },
];
export function CommandMenu({
  onClose,
  onAsk,
}: {
  onClose: () => void;
  onAsk: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const router = useRouter();
  const list = useRef<HTMLDivElement>(null);
  const id = useId();
  const options = [
    { name: "Ask Anti-Nerd", href: "" },
    ...actions,
    ...navigation.flatMap((g) =>
      g.items.map((i) => ({ name: `Go to ${i.name}`, href: i.href })),
    ),
  ].filter((i) => i.name.toLowerCase().includes(query.toLowerCase()));
  function choose(index: number) {
    const item = options[index];
    if (!item) return;
    onClose();
    if (!item.href) onAsk();
    else router.push(item.href);
  }
  return (
    <Modal
      title="Your command center"
      className="command-menu"
      onClose={onClose}
    >
      <div className="command-search-input">
        <Search size={20} />
        <input
          data-autofocus
          autoFocus
          role="combobox"
          aria-label="Search commands"
          aria-expanded="true"
          aria-controls={id}
          aria-activedescendant={
            options.length ? `${id}-${selected}` : undefined
          }
          value={query}
          placeholder="Ask, find or go somewhere…"
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              const next =
                (selected + (e.key === "ArrowDown" ? 1 : -1) + options.length) %
                Math.max(1, options.length);
              setSelected(next);
              list.current?.children[next]?.scrollIntoView({
                block: "nearest",
              });
            }
            if (e.key === "Enter") {
              e.preventDefault();
              choose(selected);
            }
          }}
        />
        <kbd>ESC</kbd>
      </div>
      <div
        ref={list}
        id={id}
        role="listbox"
        aria-label="Commands"
        className="command-options"
      >
        {options.map((item, i) => (
          <button
            id={`${id}-${i}`}
            key={item.name}
            role="option"
            aria-selected={selected === i}
            tabIndex={-1}
            onMouseEnter={() => setSelected(i)}
            onClick={() => choose(i)}
          >
            {item.href ? <ArrowUpRight size={16} /> : <Sparkles size={16} />}
            <span>{item.name}</span>
            <small>{item.href ? "Open workspace" : "Demo assistant"}</small>
          </button>
        ))}
        {!options.length && (
          <div className="empty">
            <h3>Nothing here yet.</h3>
            <p>Try “orders”, “profit” or “brain”.</p>
          </div>
        )}
      </div>
      <div className="command-hints">
        <span>
          <kbd>↑ ↓</kbd> Navigate
        </span>
        <span>
          <kbd>↵</kbd> Open
        </span>
        <span>Actions open existing demo screens.</span>
      </div>
    </Modal>
  );
}
