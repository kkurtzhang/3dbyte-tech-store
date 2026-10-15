import { useState } from "react";
import { Badge, Button, Text, Textarea } from "@medusajs/ui";
import type {
  SupportDeliveryAction,
  SupportDeliveryView,
} from "@3dbyte-tech-store/shared-types";

const explanations = {
  pending: "Saved intent; no provider call has started.",
  queued: "Reserved for dispatch. Do not start another send.",
  sent: "Provider acceptance recorded. Inbox delivery is not verified.",
  failed:
    "An Admin recorded confirmed non-acceptance; one new attempt can be authorized.",
  unknown:
    "Provider outcome is uncertain. Do not retry until it is reconciled.",
};
function DeliveryCard({
  delivery,
  onAction,
  onRefresh,
}: {
  delivery: SupportDeliveryView;
  onAction: (action: SupportDeliveryAction) => Promise<unknown>;
  onRefresh: () => void;
}) {
  const [outcome, setOutcome] = useState<
    "accepted" | "not_accepted" | "unresolved"
  >("unresolved");
  const [evidence, setEvidence] = useState("");
  const [reference, setReference] = useState("");
  const [stopped, setStopped] = useState(false);
  const [authorize, setAuthorize] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(action: SupportDeliveryAction) {
    setBusy(true);
    setError("");
    try {
      await onAction(action);
      setAuthorize(false);
      setEvidence("");
      setReference("");
      setStopped(false);
      onRefresh();
    } catch {
      setAuthorize(false);
      setError(
        "The outcome may be uncertain. Refresh status before another action.",
      );
      onRefresh();
    } finally {
      setBusy(false);
    }
  }
  const common = {
    kind: delivery.kind,
    expectedVersion: delivery.version,
    confirmed: true as const,
  };
  return (
    <section
      aria-label={`${delivery.kind} email`}
      className="flex flex-col gap-3 rounded-md border border-ui-border-base p-4"
    >
      <div className="flex items-center gap-2">
        <Text weight="plus">
          {delivery.kind === "customer"
            ? "Customer email"
            : "Support inbox email"}
        </Text>
        <Badge>{delivery.status}</Badge>
      </div>
      <Text>
        {delivery.recipient ??
          "Original recipient unavailable; sending is blocked."}
      </Text>
      <Text>{explanations[delivery.status]}</Text>
      <Text size="small">
        Attempt {delivery.attempt} · Version {delivery.version}
      </Text>
      {delivery.key && (
        <Text size="small" className="break-all">
          Provider lookup key: {delivery.key}
        </Text>
      )}
      {delivery.providerId && (
        <Text size="small">Provider reference: {delivery.providerId}</Text>
      )}
      {!delivery.canReconcile &&
        ["queued", "unknown"].includes(delivery.status) &&
        delivery.reviewAfter && (
          <Text size="small">
            Wait until {new Date(delivery.reviewAfter).toISOString()} before
            reconciliation. Confirm the original sender has stopped before
            recording non-acceptance.
          </Text>
        )}
      {delivery.canSend && (
        <>
          <label>
            <input
              type="checkbox"
              checked={authorize}
              onChange={(event) => setAuthorize(event.target.checked)}
              disabled={busy}
            />{" "}
            I authorize one email to this original recipient.
          </label>
          <Button
            size="small"
            disabled={!authorize || busy}
            onClick={() => submit({ ...common, action: "send" })}
          >
            Send one email
          </Button>
        </>
      )}
      {delivery.canReconcile && (
        <>
          <label>
            Verified provider outcome
            <select
              aria-label="Verified provider outcome"
              className="ml-2 rounded border p-1"
              value={outcome}
              onChange={(event) =>
                setOutcome(event.target.value as typeof outcome)
              }
              disabled={busy}
            >
              <option value="unresolved">Still uncertain — keep blocked</option>
              <option value="accepted">Provider confirmed acceptance</option>
              <option value="not_accepted">
                Provider confirmed non-acceptance
              </option>
            </select>
          </label>
          <label>
            Provider case or message reference
            <input
              aria-label="Provider case or message reference"
              className="w-full rounded border p-2"
              maxLength={200}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              disabled={busy}
            />
          </label>
          <label>
            Reconciliation evidence
            <Textarea
              aria-label="Reconciliation evidence"
              maxLength={2000}
              value={evidence}
              onChange={(event) => setEvidence(event.target.value)}
              disabled={busy}
            />
          </label>
          {outcome === "not_accepted" && (
            <label>
              <input
                type="checkbox"
                checked={stopped}
                onChange={(event) => setStopped(event.target.checked)}
                disabled={busy}
              />{" "}
              I verified the original sending process has stopped and the
              provider did not accept this email.
            </label>
          )}
          <Button
            size="small"
            disabled={
              busy ||
              evidence.trim().length < 20 ||
              reference.trim().length < 3 ||
              (outcome === "not_accepted" && !stopped)
            }
            onClick={() =>
              submit({
                ...common,
                action: "reconcile",
                outcome,
                evidence,
                providerReference: reference,
                senderStopped: stopped,
              })
            }
          >
            Record reconciliation
          </Button>
        </>
      )}
      {error && <Text role="alert">{error}</Text>}
    </section>
  );
}
export function SupportDeliveries({
  deliveries,
  onAction,
  onRefresh,
}: {
  deliveries: SupportDeliveryView[];
  onAction: (action: SupportDeliveryAction) => Promise<unknown>;
  onRefresh: () => void;
}) {
  if (!deliveries.length) return null;
  return (
    <section
      aria-label="Ticket email delivery"
      className="flex flex-col gap-4 px-6 py-4"
    >
      <div className="flex items-center justify-between">
        <Text weight="plus">Ticket email delivery</Text>
        <Button size="small" variant="secondary" onClick={onRefresh}>
          Refresh delivery status
        </Button>
      </div>
      <Text>
        Reconciliation records evidence; it does not send email. A retry
        requires a separate authorization. Never infer non-delivery from an
        error or missing acknowledgement.
      </Text>
      {deliveries.map((delivery) => (
        <DeliveryCard
          key={`${delivery.kind}:${delivery.version}`}
          delivery={delivery}
          onAction={onAction}
          onRefresh={onRefresh}
        />
      ))}
    </section>
  );
}
