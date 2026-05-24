import { MedusaService } from "@medusajs/framework/utils"

import { SupportTicket } from "./models/support-ticket"
import { SupportTicketEvent } from "./models/support-ticket-event"
import { SupportTicketMessage } from "./models/support-ticket-message"

class SupportTicketModuleService extends MedusaService({
  SupportTicket,
  SupportTicketEvent,
  SupportTicketMessage,
}) {}

export default SupportTicketModuleService
