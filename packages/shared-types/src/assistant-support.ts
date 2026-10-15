/** Direct UI contract. Receipts must never enter model context or chat history. */
export type AssistantSupportPreview = {
  status: "confirmation_required";
  proposalId: string;
  receipt: string;
  digest: string;
  expiresAt: number;
  payload: {
    name: string;
    email: string;
    subject: string;
    message: string;
    category: string;
    priority: string;
    order_reference: string | null;
    product_handle: string | null;
    ai_summary: string | null;
    transcript_excerpt: string | null;
    consent_to_include_transcript: boolean;
    customerLinked: boolean;
    orderVerified: boolean;
    supportInbox: string;
  };
};
export type AssistantSupportResult = {
  status: "submitted";
  ticket: { id: string; ticket_number: string; status: string };
};
