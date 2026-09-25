"use client";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, Search, Sparkles, X } from "lucide-react";
export function Badge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: "green" | "amber" | "gray";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Card({
  title,
  subtitle,
  children,
  action,
  className = "",
  variant = "default",
}: {
  variant?: "default" | "subtle" | "raised" | "insight" | "warning";
  title?: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card surface-${variant} ${className}`}>
      {title && (
        <div className="card-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Tabs({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="tabs">
      {options.map((option) => (
        <button
          key={option}
          aria-pressed={value === option}
          className={value === option ? "selected" : ""}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
export function SearchField({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-field">
      <Search size={16} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function EmptyState() {
  return (
    <div className="empty">
      <Search size={28} />
      <h3>No results found</h3>
      <p>Try a different search or adjust your filters.</p>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
const FeedbackContext = createContext<{
  notify: (message: string) => void;
  preview: (title: string) => void;
}>({ notify: () => {}, preview: () => {} });
export const useFeedback = () => useContext(FeedbackContext);
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState("");
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <FeedbackContext.Provider value={{ notify: setToast, preview: setModal }}>
      {children}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <Modal title={modal} onClose={() => setModal("")}>
          <div className="preview-icon">
            <Sparkles />
          </div>
          <h3>A preview of what’s next</h3>
          <p className="muted">
            This workspace uses sample data. {modal} will be available when the
            service is connected in the next development phase. No external
            action has been taken.
          </p>
          <button className="button primary" onClick={() => setModal("")}>
            Got it
          </button>
        </Modal>
      )}
    </FeedbackContext.Provider>
  );
}
