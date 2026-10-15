import { z } from "@medusajs/framework/zod";
import type {
  AuthenticatedMedusaRequest,
  MedusaRequest,
} from "@medusajs/framework/http";
import type { AssistantSupportPreview } from "@3dbyte-tech-store/shared-types";

import { getRequestHeader } from "../../api/support-ticket-utils";
import { consentHash } from "./consent-store";
import { SUPPORT_TICKET_CATEGORIES, SUPPORT_TICKET_PRIORITIES } from "./types";

export const consentId = z.string().regex(/^[a-f0-9]{64}$/);
export const draftSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    subject: z.string().trim().min(1).max(160),
    message: z.string().trim().min(1).max(4000),
    category: z.enum(SUPPORT_TICKET_CATEGORIES).default("general"),
    priority: z.enum(SUPPORT_TICKET_PRIORITIES).default("normal"),
    order_reference: z.string().trim().min(1).max(80).nullable().default(null),
    product_handle: z.string().trim().min(1).max(160).nullable().default(null),
    ai_summary: z.string().trim().min(1).max(1000).nullable().default(null),
    transcript_excerpt: z.string().max(4000).nullable().default(null),
  })
  .strict();
export const previewSchema = z
  .object({
    proposalId: consentId,
    includeTranscript: z.boolean().default(false),
  })
  .strict();
export const confirmSchema = z
  .object({
    proposalId: consentId,
    receipt: consentId,
    digest: consentId,
    confirmed: z.literal(true),
  })
  .strict();
export type ConsentDraft = z.infer<typeof draftSchema>;
export type ConsentPayload = AssistantSupportPreview["payload"] &
  Pick<ConsentDraft, "category" | "priority"> & {
    customer_id: string | null;
    order_id: string | null;
  };
export function getConsentContext(req: MedusaRequest) {
  const session = consentId.parse(
    getRequestHeader(req, "x-3db-assistant-session"),
  );
  const customerId =
    (req as AuthenticatedMedusaRequest).auth_context?.actor_id || null;
  return {
    customerId,
    context: consentHash(JSON.stringify([session, customerId])),
  };
}
export async function deriveConsentPayload(
  req: MedusaRequest,
  draft: ConsentDraft,
  includeTranscript: boolean,
): Promise<ConsentPayload> {
  const { customerId } = getConsentContext(req);
  let orderId: string | null = null;
  // Guest references remain explicitly unverified. Account and order IDs are
  // never accepted from the model, transcript, or submitted confirmation body.
  if (customerId) {
    const query = req.scope.resolve("query");
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id"],
      filters: { id: customerId },
    });
    if (!customers?.[0]) throw new Error("Customer unavailable");
    if (draft.order_reference) {
      const { data } = await query.graph({
        entity: "order",
        fields: ["id", "customer_id", "email"],
        filters: {
          custom_display_id: draft.order_reference,
          customer_id: customerId,
        },
      });
      const order = data?.[0];
      if (
        order?.customer_id === customerId &&
        order.email?.toLowerCase() === draft.email
      )
        orderId = order.id;
    }
  }
  return {
    ...draft,
    transcript_excerpt: includeTranscript ? draft.transcript_excerpt : null,
    consent_to_include_transcript: includeTranscript,
    customer_id: customerId,
    order_id: orderId,
    customerLinked: Boolean(customerId),
    orderVerified: Boolean(orderId),
    supportInbox: z
      .string()
      .email()
      .parse(
        process.env.SUPPORT_TICKET_INBOX_EMAIL || "support@3dbytetech.com.au",
      ),
  };
}
