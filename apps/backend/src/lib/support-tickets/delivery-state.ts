import type {
  SupportDeliveryKind,
  SupportDeliveryStatus,
  SupportDeliveryView,
} from "@3dbyte-tech-store/shared-types";
import type { SupportTicketEventRecord, SupportTicketRecord } from "./types";

export const DELIVERY_EVENT = "ai_notification_delivery_state";
export const MAX_DELIVERY_ATTEMPTS = 5;
export const DELIVERY_REVIEW_DELAY_MS = 120_000;
export class DeliveryConflict extends Error {}
export type DeliveryRecord = {
  ticketId: string;
  kind: SupportDeliveryKind;
  recipient: string | null;
  snapshot: SupportTicketRecord;
  payload: Record<string, unknown> | null;
  status: SupportDeliveryStatus;
  version: number;
  attempt: number;
  key: string | null;
  notificationId: string | null;
  providerId: string | null;
  reviewAfter: number | null;
};
export type DeliveryCommand =
  | {
      action: "claim";
      expectedVersion: number;
      payload: Record<string, unknown>;
      actorId: string | null;
    }
  | { action: "begin"; expectedVersion: number }
  | {
      action: "sent";
      expectedVersion: number;
      notificationId: string;
      providerId: string;
    }
  | {
      action: "reconcile";
      expectedVersion: number;
      actorId: string;
      outcome: "accepted" | "not_accepted" | "unresolved";
      evidence: string;
      providerReference: string;
      senderStopped: boolean;
    };

export function initialDelivery(
  ticket: SupportTicketRecord,
  kind: SupportDeliveryKind,
  fresh: boolean,
): DeliveryRecord {
  // Only email content fields enter the immutable provider snapshot. No consent tokens/context metadata.
  const snapshot: SupportTicketRecord = {
    id: ticket.id,
    ticket_number: ticket.ticket_number,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    source: ticket.source,
    subject: ticket.subject,
    customer_name: ticket.customer_name,
    customer_email: ticket.customer_email,
    order_reference: ticket.order_reference,
    product_handle: ticket.product_handle,
    ai_summary: ticket.ai_summary,
    created_at: ticket.created_at,
  };
  const inbox = ticket.metadata?.consent_support_inbox;
  return {
    ticketId: ticket.id,
    kind,
    snapshot,
    recipient:
      kind === "customer"
        ? ticket.customer_email
        : typeof inbox === "string" && inbox
          ? inbox
          : null,
    payload: null,
    status: fresh ? "pending" : "unknown",
    version: 0,
    attempt: 0,
    key: fresh
      ? null
      : `support-ticket/${kind === "customer" ? "customer" : "internal"}-created/${ticket.id}`,
    notificationId: null,
    providerId: null,
    reviewAfter: null,
  };
}
export function deliveryFromEvents(
  ticket: SupportTicketRecord,
  events: SupportTicketEventRecord[],
  kind: SupportDeliveryKind,
): DeliveryRecord {
  let latest = initialDelivery(ticket, kind, false);
  let found = false;
  for (const event of events) {
    if (event.type !== DELIVERY_EVENT) continue;
    const value = event.metadata?.delivery as DeliveryRecord | undefined;
    if (
      !value ||
      value.ticketId !== ticket.id ||
      !["customer", "internal"].includes(value.kind) ||
      !Number.isSafeInteger(value.version) ||
      !["pending", "queued", "sent", "failed", "unknown"].includes(value.status)
    )
      throw new DeliveryConflict("Invalid delivery journal");
    if (value.kind === kind && (!found || value.version > latest.version)) {
      latest = value;
      found = true;
    }
  }
  return latest;
}
export function publicDelivery(
  record: DeliveryRecord,
  now = Date.now(),
): SupportDeliveryView {
  const {
    snapshot: _snapshot,
    payload: _payload,
    ticketId: _ticket,
    ...view
  } = record;
  return {
    ...view,
    status:
      record.status === "queued" && (record.reviewAfter ?? Infinity) <= now
        ? "unknown"
        : record.status,
    canSend:
      Boolean(record.recipient) &&
      ["pending", "failed"].includes(record.status) &&
      record.attempt < MAX_DELIVERY_ATTEMPTS,
    canReconcile:
      Boolean(record.recipient) &&
      ["unknown", "queued"].includes(record.status) &&
      (record.reviewAfter ?? 0) <= now,
  };
}
export function transitionDelivery(
  record: DeliveryRecord,
  command: DeliveryCommand,
  now = Date.now(),
): DeliveryRecord {
  if (command.expectedVersion !== record.version || !record.recipient)
    throw new DeliveryConflict("Delivery changed; refresh status");
  const next = { ...record, version: record.version + 1 };
  if (command.action === "claim") {
    if (
      !["pending", "failed"].includes(record.status) ||
      (record.status === "failed" && !command.actorId) ||
      record.attempt >= MAX_DELIVERY_ATTEMPTS
    )
      throw new DeliveryConflict("Reconciliation is required before retry");
    const payload = record.payload ?? command.payload;
    if (payload.to !== record.recipient || payload.channel !== "email")
      throw new DeliveryConflict("Recipient mismatch");
    return {
      ...next,
      payload,
      status: "queued",
      attempt: record.attempt + 1,
      key: `support-ticket/delivery/${record.ticketId}/${record.kind}/${record.attempt + 1}`,
      notificationId: null,
      providerId: null,
      reviewAfter: now + DELIVERY_REVIEW_DELAY_MS,
    };
  }
  if (command.action === "begin") {
    if (
      record.status !== "queued" ||
      (record.reviewAfter ?? 0) <= now ||
      !record.payload
    )
      throw new DeliveryConflict("Dispatch claim is no longer valid");
    // Commit uncertainty BEFORE the external call. Crashes and errors never reopen the claim.
    return {
      ...next,
      status: "unknown",
      reviewAfter: now + DELIVERY_REVIEW_DELAY_MS,
    };
  }
  if (command.action === "sent") {
    if (
      record.status !== "unknown" ||
      !command.notificationId ||
      !command.providerId
    )
      throw new DeliveryConflict("Provider acceptance is not confirmed");
    return {
      ...next,
      status: "sent",
      notificationId: command.notificationId,
      providerId: command.providerId,
      reviewAfter: null,
    };
  }
  if (
    !command.actorId ||
    !publicDelivery(record, now).canReconcile ||
    command.evidence.trim().length < 20 ||
    command.evidence.length > 2000 ||
    command.providerReference.trim().length < 3 ||
    command.providerReference.length > 200 ||
    (command.outcome === "not_accepted" && !command.senderStopped)
  )
    throw new DeliveryConflict("Verified reconciliation is required");
  return {
    ...next,
    status:
      command.outcome === "accepted"
        ? "sent"
        : command.outcome === "not_accepted"
          ? "failed"
          : "unknown",
    providerId:
      command.outcome === "accepted"
        ? command.providerReference.trim()
        : record.providerId,
    reviewAfter: null,
  };
}
