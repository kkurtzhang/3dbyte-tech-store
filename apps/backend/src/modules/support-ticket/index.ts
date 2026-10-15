import { Module } from "@medusajs/framework/utils";

import SupportTicketModuleService from "./service";
import { runSupportTicketMigrations } from "./run-migrations";

export const SUPPORT_TICKET_MODULE = "supportTicket";

export default {
  ...Module(SUPPORT_TICKET_MODULE, { service: SupportTicketModuleService }),
  runMigrations: runSupportTicketMigrations,
};
