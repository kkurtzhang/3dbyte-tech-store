import type { Context } from "@medusajs/framework/types";
import type { CreateSupportTicketInput } from "../../lib/support-tickets/validation";
import { generateSupportTicketNumber } from "../../lib/support-tickets/ticket-number";
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils";

import { SupportTicket } from "./models/support-ticket";
import { SupportTicketEvent } from "./models/support-ticket-event";
import { SupportTicketMessage } from "./models/support-ticket-message";

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
    return ticket;
  }
}

export default SupportTicketModuleService;
