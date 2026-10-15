import type { MedusaRequest } from "@medusajs/framework/http";
import type { AssistantSupportResult } from "@3dbyte-tech-store/shared-types";
import { getSupportTicketModule } from "../../api/support-ticket-utils";
import { ConsentConflict } from "./consent-store";
import { sendSupportTicketCreatedNotifications } from "./notifications";
import type { SupportTicketRecord } from "./types";

const QUEUED_EVENT = "ai_handoff_notifications_queued";
export function savedSupportResult(
  ticket: SupportTicketRecord,
  notificationStatus: AssistantSupportResult["notificationStatus"],
): AssistantSupportResult {
  return {
    status: "submitted",
    notificationStatus,
    ticket: {
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      status: ticket.status,
    },
  };
}
/** Read-only recovery works after Redis expiry/loss, only for the original context. */
export async function findSavedSupportResult(
  req: MedusaRequest,
  proposalId: string,
  context: string,
) {
  const service = getSupportTicketModule(req);
  const [ticket] = await service.listSupportTickets(
    { ai_consent_proposal_id: proposalId },
    { take: 1 },
  );
  if (!ticket) return undefined;
  if (ticket.metadata?.consent_context_hash !== context)
    throw new ConsentConflict();
  const queued = await service.listSupportTicketEvents(
    { ticket_id: ticket.id, type: QUEUED_EVENT },
    { take: 1 },
  );
  return savedSupportResult(ticket, queued.length ? "queued" : "pending");
}
export async function queueConfirmedSupportNotifications(
  req: MedusaRequest,
  ticket: SupportTicketRecord,
  supportInboxEmail: string,
): Promise<AssistantSupportResult["notificationStatus"]> {
  try {
    await sendSupportTicketCreatedNotifications({
      container: req.scope,
      ticket,
      supportInboxEmail,
    });
    // This records queue acceptance, not provider delivery. An uncertain outcome
    // stays pending; status reads never retry sends or change confirmed recipients.
    await getSupportTicketModule(req).createSupportTicketEvents({
      ticket_id: ticket.id,
      type: QUEUED_EVENT,
      actor_type: "system",
    });
    return "queued";
  } catch {
    req.scope
      .resolve("logger")
      .warn("AI support ticket saved; notification delivery needs review");
    return "pending";
  }
}
