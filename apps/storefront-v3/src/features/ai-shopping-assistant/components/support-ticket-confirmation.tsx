"use client";

import type {
  AssistantSupportPreview,
  AssistantSupportResult,
} from "@3dbyte-tech-store/shared-types";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Preview = AssistantSupportPreview | AssistantSupportResult;
export function getSupportProposalId(
  parts: Array<{ type: string; [key: string]: unknown }>,
) {
  for (const part of parts) {
    if (
      part.type !== "tool-createSupportTicket" ||
      part.state !== "output-available"
    )
      continue;
    const output = part.output as
      | { status?: string; proposalId?: string }
      | undefined;
    if (
      output?.status === "confirmation_required" &&
      /^[a-f0-9]{64}$/.test(output.proposalId || "")
    )
      return output.proposalId;
  }
  return undefined;
}
export function SupportTicketConfirmation({
  proposalId,
}: {
  proposalId: string;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [includeTranscript, setIncludeTranscript] = useState(false);
  async function request(
    action: "preview" | "confirm",
    include = includeTranscript,
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const body =
        action === "preview"
          ? { action, proposalId, includeTranscript: include }
          : preview?.status === "confirmation_required"
            ? {
                action,
                proposalId,
                receipt: preview.receipt,
                digest: preview.digest,
                confirmed: true,
              }
            : null;
      if (!body) return;
      const response = await fetch(
        "/api/ai-shopping-assistant/support-ticket",
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Support request unavailable.");
      if (
        data.status !== "confirmation_required" &&
        data.status !== "submitted"
      )
        throw new Error("Support preview unavailable.");
      setPreview(data);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Support request unavailable.",
      );
      // A failed submit is uncertain. Require a fresh status/preview check;
      // never reuse the receipt or automatically retry the mutation.
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }
  if (preview?.status === "submitted")
    return (
      <div role="status" className="mt-3 rounded border p-3">
        Support request {preview.ticket.ticket_number} was sent.
      </div>
    );
  return (
    <section
      aria-label="Review support request"
      className="mt-3 space-y-3 rounded border p-3 text-sm"
    >
      <p>Review your request before sending it to our support team.</p>
      {preview?.status === "confirmation_required" ? (
        <>
          <dl className="space-y-2 break-words">
            <dt className="font-semibold">To</dt>
            <dd>{preview.payload.supportInbox}</dd>
            <dt className="font-semibold">Reply email</dt>
            <dd>{preview.payload.email}</dd>
            <dt className="font-semibold">Name</dt>
            <dd>{preview.payload.name}</dd>
            <dt className="font-semibold">Subject</dt>
            <dd>{preview.payload.subject}</dd>
            <dt className="font-semibold">Message</dt>
            <dd className="whitespace-pre-wrap">{preview.payload.message}</dd>
            <dt className="font-semibold">Category and priority</dt>
            <dd>
              {preview.payload.category} / {preview.payload.priority}
            </dd>
            {preview.payload.order_reference ? (
              <>
                <dt>Order reference</dt>
                <dd>
                  {preview.payload.order_reference} (
                  {preview.payload.orderVerified
                    ? "verified for your signed-in account"
                    : "unverified reference"}
                  )
                </dd>
              </>
            ) : null}
            {preview.payload.product_handle ? (
              <>
                <dt>Product reference</dt>
                <dd>{preview.payload.product_handle}</dd>
              </>
            ) : null}
            {preview.payload.ai_summary ? (
              <>
                <dt>Assistant summary</dt>
                <dd>{preview.payload.ai_summary}</dd>
              </>
            ) : null}
            {preview.payload.customerLinked ? (
              <p>This request will be linked to your signed-in account.</p>
            ) : null}
          </dl>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={includeTranscript}
              disabled={busy}
              onChange={(event) => {
                setIncludeTranscript(event.target.checked);
                void request("preview", event.target.checked);
              }}
            />
            Include the conversation excerpt shown below
          </label>
          {preview.payload.transcript_excerpt ? (
            <pre className="whitespace-pre-wrap break-words text-xs">
              {preview.payload.transcript_excerpt}
            </pre>
          ) : (
            <p>No conversation transcript will be included.</p>
          )}
          <p>
            A confirmation email will be sent to {preview.payload.email}. This
            preview expires after two minutes.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || Date.now() >= preview.expiresAt}
              onClick={() => void request("confirm")}
            >
              Send support request
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setPreview(null);
                setIncludeTranscript(false);
              }}
            >
              Cancel
            </Button>
          </div>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => void request("preview")}
          >
            Refresh preview
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void request("preview")}
        >
          Review support request
        </Button>
      )}
      {busy ? <p role="status">Checking request…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
