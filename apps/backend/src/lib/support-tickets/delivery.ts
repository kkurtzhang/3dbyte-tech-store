import type { MedusaRequest } from "@medusajs/framework/http";
import type { SupportDeliveryKind } from "@3dbyte-tech-store/shared-types";
import { getSupportTicketModule } from "../../api/support-ticket-utils";
import { buildSupportCreatedNotification } from "./notifications";
import {
  DELIVERY_EVENT,
  deliveryFromEvents,
  publicDelivery,
  DeliveryConflict,
} from "./delivery-state";
import type { SupportTicketRecord } from "./types";

export async function readTicketDeliveries(
  req: MedusaRequest,
  ticket: SupportTicketRecord,
) {
  const events = await getSupportTicketModule(req).listSupportTicketEvents({
    ticket_id: ticket.id,
    type: DELIVERY_EVENT,
  });
  return (["customer", "internal"] as const).map((kind) =>
    deliveryFromEvents(ticket, events, kind),
  );
}
export async function deliveryViews(
  req: MedusaRequest,
  ticket: SupportTicketRecord,
) {
  if (ticket.source !== "ai_chat") return [];
  return (await readTicketDeliveries(req, ticket)).map((record) =>
    publicDelivery(record),
  );
}
export async function dispatchTicketDelivery(
  req: MedusaRequest,
  ticket: SupportTicketRecord,
  kind: SupportDeliveryKind,
  expectedVersion: number,
  actorId: string | null,
) {
  const service = getSupportTicketModule(req);
  const records = await readTicketDeliveries(req, ticket);
  const record = records.find((item) => item.kind === kind)!;
  if (
    record.version !== expectedVersion ||
    !publicDelivery(record).canSend ||
    (!actorId && record.status !== "pending")
  )
    throw new DeliveryConflict("Refresh delivery status");
  const inbox = records.find((item) => item.kind === "internal")?.recipient;
  if (!inbox) throw new DeliveryConflict("Confirmed inbox is unavailable");
  const payload =
    record.payload ??
    (await buildSupportCreatedNotification(
      req.scope,
      record.snapshot,
      inbox,
      kind,
    ));
  const claim = await service.transitionDelivery(ticket.id, kind, {
    action: "claim",
    expectedVersion,
    payload,
    actorId,
  });
  const attempt = await service.transitionDelivery(ticket.id, kind, {
    action: "begin",
    expectedVersion: claim.version,
  });
  try {
    const notification = req.scope.resolve<{
      createNotifications: (
        payload: Record<string, unknown>,
      ) => Promise<
        | {
            id?: string;
            external_id?: string;
            status?: string;
            idempotency_key?: string;
            to?: string;
          }
        | undefined
      >;
    }>("notification");
    const result = await notification.createNotifications({
      ...attempt.payload,
      idempotency_key: attempt.key,
    });
    if (
      !result?.id ||
      !result.external_id ||
      result.status !== "success" ||
      result.idempotency_key !== attempt.key ||
      result.to !== attempt.recipient
    )
      throw new Error("Unconfirmed provider acceptance");
    await service.transitionDelivery(ticket.id, kind, {
      action: "sent",
      expectedVersion: attempt.version,
      notificationId: result.id,
      providerId: result.external_id,
    });
  } catch {
    // Includes provider acceptance followed by native/journal persistence failure.
    // The pre-send unknown record remains authoritative; never retry here.
    req.scope
      .resolve("logger")
      .warn(
        "AI ticket notification outcome uncertain; authorized reconciliation required",
      );
  }
}
export async function dispatchInitialTicketDeliveries(
  req: MedusaRequest,
  ticket: SupportTicketRecord,
) {
  for (const record of await readTicketDeliveries(req, ticket)) {
    if (record.status !== "pending") continue;
    try {
      await dispatchTicketDelivery(
        req,
        ticket,
        record.kind,
        record.version,
        null,
      );
    } catch {
      req.scope
        .resolve("logger")
        .warn("AI ticket notification remains pending; check delivery status");
    }
  }
  const states = await readTicketDeliveries(req, ticket);
  return states.every((state) => state.status === "sent")
    ? ("queued" as const)
    : ("pending" as const);
}
