import type { AssistantSupportResult } from "@3dbyte-tech-store/shared-types";
import type { ConsentDraft } from "./consent-validation";

export const SUPPORT_TICKET_AI_HANDOFF_ENDPOINT = "/ai/support-ticket";
export const SUPPORT_TICKET_AI_PREPARE_ENDPOINT = "/ai/support-ticket/prepare";
export const SUPPORT_TICKET_AI_HANDOFF_HEADER = "x-3db-internal-token";
export const SUPPORT_TICKET_AI_TRANSCRIPT_MAX_LENGTH = 4_000;

export type SupportTicketAiDraftPayload = ConsentDraft;
// Direct creation with contact fields or model-owned confirmation flags is no
// longer supported. Only the separate customer UI receives this receipt.
export type SupportTicketAiHandoffPayload = {
  proposalId: string;
  receipt: string;
  digest: string;
  confirmed: true;
};
export type SupportTicketAiHandoffResponse = AssistantSupportResult;
