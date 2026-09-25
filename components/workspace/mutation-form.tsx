"use client";
import { useActionState } from "react";
import { ApprovedReadResult } from "@/components/shopify/approved-read-result";
import { workspaceAction } from "@/lib/server/db/actions";
export function MutationForm({
  operation,
  children,
  label = "Save",
  disabled = false,
}: {
  operation: string;
  children: React.ReactNode;
  label?: string;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(workspaceAction, {
    message: "",
  });
  return (
    <form action={action} className="settings-form durable-form">
      <input type="hidden" name="operation" value={operation} />
      {children}
      {state.message && (
        <p role={state.ok ? "status" : "alert"} className="auth-notice">
          {state.message}
        </p>
      )}
      {state.readResult !== undefined && (
        <ApprovedReadResult data={state.readResult} />
      )}
      <button
        className="button primary"
        disabled={pending || disabled || (operation === "approve" && state.ok)}
      >
        {pending ? "Saving…" : label}
      </button>
    </form>
  );
}
