import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils";
import {
  DELIVERY_EVENT,
  initialDelivery,
  deliveryFromEvents,
  transitionDelivery,
  DeliveryConflict,
} from "../../lib/support-tickets/delivery-state";
import { generateSupportTicketNumber } from "../../lib/support-tickets/ticket-number";
import { SupportTicket } from "./models/support-ticket";
import { SupportTicketEvent } from "./models/support-ticket-event";
import { SupportTicketMessage } from "./models/support-ticket-message";
import type { Context } from "@medusajs/framework/types";
import type { SupportDeliveryKind } from "@3dbyte-tech-store/shared-types";
import type { DeliveryCommand } from "../../lib/support-tickets/delivery-state";
import type { CreateSupportTicketInput } from "../../lib/support-tickets/validation";

class SupportTicketModuleService extends MedusaService({
  SupportTicket,
  SupportTicketEvent,
  SupportTicketMessage,
}) {
  @InjectManager()
  @InjectTransactionManager()
  async createConfirmedAiHandoff(
    input: CreateSupportTicketInput & { consent_proposal_id: string },
    @MedusaContext() context: Context = {},
  ) {
    const ticket = await this.createSupportTickets(
      {
        ticket_number: generateSupportTicketNumber(),
        ai_consent_proposal_id: input.consent_proposal_id,
        status: "new",
        source: "ai_chat",
        priority: input.priority,
        category: input.category,
        subject: input.subject,
        customer_name: input.name,
        customer_email: input.email,
        customer_id: input.customer_id,
        order_id: input.order_id,
        order_reference: input.order_reference,
        product_id: null,
        product_handle: input.product_handle,
        ai_summary: input.ai_summary,
        metadata: input.metadata,
        last_message_at: new Date(),
      },
      context,
    );
    await this.createSupportTicketMessages(
      {
        ticket_id: ticket.id,
        author_type: "customer",
        direction: "inbound",
        visibility: "customer",
        body: input.message,
        author_name: input.name,
        author_email: input.email,
        metadata: input.metadata,
      },
      context,
    );
    await this.createSupportTicketEvents(
      {
        ticket_id: ticket.id,
        type: "ai_handoff_confirmed",
        actor_type: "customer",
        actor_id: input.customer_id,
        metadata: input.metadata,
      },
      context,
    );
    for (const kind of ["customer", "internal"] as const) {
      await this.createSupportTicketEvents(
        {
          ticket_id: ticket.id,
          type: DELIVERY_EVENT,
          actor_type: "system",
          metadata: { delivery: initialDelivery(ticket, kind, true) },
        },
        context,
      );
    }
    return ticket;
  }
  @InjectManager()
  @InjectTransactionManager()
  async transitionDelivery(
    ticketId: string,
    kind: SupportDeliveryKind,
    command: DeliveryCommand,
    @MedusaContext() context: Context = {},
  ) {
    // Narrow adapter to the pinned native SQL transaction manager. Fail closed if unavailable.
    const manager = context.transactionManager as
      | { execute?: (sql: string, parameters: unknown[]) => Promise<unknown[]> }
      | undefined;
    if (!manager?.execute)
      throw new Error("Native delivery transaction required");
    const locked = await manager.execute(
      "select id from support_ticket where id = ? and deleted_at is null for update",
      [ticketId],
    );
    if (!locked.length) throw new DeliveryConflict("Ticket unavailable");
    const [ticket] = await this.listSupportTickets(
      { id: ticketId },
      {},
      context,
    );
    if (
      !ticket ||
      ticket.source !== "ai_chat" ||
      !ticket.ai_consent_proposal_id
    )
      throw new DeliveryConflict("Confirmed AI ticket required");
    const events = await this.listSupportTicketEvents(
      { ticket_id: ticketId, type: DELIVERY_EVENT },
      {},
      context,
    );
    const before = deliveryFromEvents(ticket, events, kind);
    const after = transitionDelivery(before, command);
    await this.createSupportTicketEvents(
      {
        ticket_id: ticketId,
        type: DELIVERY_EVENT,
        actor_type:
          "actorId" in command && command.actorId ? "admin" : "system",
        actor_id: "actorId" in command ? command.actorId : null,
        metadata: {
          delivery: after,
          ...(command.action === "reconcile"
            ? {
                reconciliation: {
                  outcome: command.outcome,
                  evidence: command.evidence.trim(),
                  provider_reference: command.providerReference.trim(),
                  sender_stopped: command.senderStopped,
                },
              }
            : {}),
        },
      },
      context,
    );
    return after;
  }
}

export default SupportTicketModuleService;
