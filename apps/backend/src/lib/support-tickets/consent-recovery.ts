import type { MedusaRequest } from "@medusajs/framework/http";
import type { AssistantSupportResult } from "@3dbyte-tech-store/shared-types";
import { getSupportTicketModule } from "../../api/support-ticket-utils";
import { ConsentConflict } from "./consent-store";
import {
  dispatchInitialTicketDeliveries,
  readTicketDeliveries,
} from "./delivery";
import type { SupportTicketRecord } from "./types";

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
  const states = await readTicketDeliveries(req, ticket);
  return savedSupportResult(
    ticket,
    states.every((state) => state.status === "sent") ? "queued" : "pending",
  );
}
export async function queueConfirmedSupportNotifications(
  req: MedusaRequest,
  ticket: SupportTicketRecord,
  _supportInboxEmail: string,
): Promise<AssistantSupportResult["notificationStatus"]> {
  try {
    return await dispatchInitialTicketDeliveries(req, ticket);
  } catch {
    req.scope
      .resolve("logger")
      .warn("AI ticket saved; notification journal needs review");
    return "pending";
  }
}
