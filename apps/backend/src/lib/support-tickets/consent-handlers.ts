import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";

import { authorizeInternalAiRequest } from "../../api/ai/_utils";
import { getSupportTicketModule } from "../../api/support-ticket-utils";
import {
  findSavedSupportResult,
  queueConfirmedSupportNotifications,
  savedSupportResult,
} from "./consent-recovery";
import {
  consentHash,
  consentToken,
  consentStore,
  ConsentConflict,
  PROPOSAL_TTL_MS,
  RECEIPT_TTL_MS,
} from "./consent-store";
import {
  confirmSchema,
  previewSchema,
  draftSchema,
  getConsentContext,
  deriveConsentPayload,
} from "./consent-validation";

function failure(res: MedusaResponse, error: unknown) {
  if (error instanceof z.ZodError)
    return res
      .status(400)
      .json({ error: "Invalid support confirmation request" });
  if (error instanceof ConsentConflict)
    return res.status(409).json({
      error:
        "This preview expired, changed or was already submitted. Check its status before starting another request.",
    });
  return res.status(503).json({
    error:
      "Support confirmation is unavailable. Submission may be incomplete; do not submit another request until its status is checked.",
  });
}
export async function prepareSupportTicket(
  req: MedusaRequest,
  res: MedusaResponse,
) {
  if (!authorizeInternalAiRequest(req, res)) return;
  try {
    const draft = draftSchema.parse(req.body);
    const { context } = getConsentContext(req);
    const proposalId = consentToken();
    const expiresAt = Date.now() + PROPOSAL_TTL_MS;
    await consentStore.create(proposalId, {
      context,
      expiresAt,
      status: "draft",
      draft,
    });
    // This is the only output exposed to the model. No receipt or ticket exists.
    return res.json({ status: "confirmation_required", proposalId, expiresAt });
  } catch (error) {
    return failure(res, error);
  }
}
export async function previewSupportTicket(
  req: MedusaRequest,
  res: MedusaResponse,
) {
  if (!authorizeInternalAiRequest(req, res)) return;
  try {
    const input = previewSchema.parse(req.body);
    const { context } = getConsentContext(req);
    const saved = await findSavedSupportResult(req, input.proposalId, context);
    if (saved) return res.json(saved);
    const { raw, record } = await consentStore.read(input.proposalId, context);
    if (record.status === "submitted") return res.json(record.result);
    if (!record.draft || record.status === "processing")
      throw new ConsentConflict();
    const payload = await deriveConsentPayload(
      req,
      record.draft,
      input.includeTranscript,
    );
    const receipt = consentToken();
    const digest = consentHash(JSON.stringify(payload));
    const expiresAt = Math.min(record.expiresAt, Date.now() + RECEIPT_TTL_MS);
    await consentStore.replace(input.proposalId, raw, {
      ...record,
      status: "preview",
      payload,
      digest,
      receiptHash: consentHash(receipt),
      receiptExpiresAt: expiresAt,
    });
    const {
      customer_id: _customerId,
      order_id: _orderId,
      ...visible
    } = payload;
    return res.json({
      status: "confirmation_required",
      proposalId: input.proposalId,
      receipt,
      digest,
      expiresAt,
      payload: visible,
    });
  } catch (error) {
    return failure(res, error);
  }
}
export async function confirmSupportTicket(
  req: MedusaRequest,
  res: MedusaResponse,
) {
  if (!authorizeInternalAiRequest(req, res)) return;
  try {
    const input = confirmSchema.parse(req.body);
    const { context } = getConsentContext(req);
    const { raw, record } = await consentStore.read(input.proposalId, context);
    if (
      record.status !== "preview" ||
      !record.payload ||
      !record.draft ||
      !record.receiptExpiresAt ||
      record.receiptExpiresAt <= Date.now() ||
      record.receiptHash !== consentHash(input.receipt) ||
      record.digest !== input.digest ||
      consentHash(JSON.stringify(record.payload)) !== input.digest
    )
      throw new ConsentConflict();
    const payload = await deriveConsentPayload(
      req,
      record.draft,
      record.payload.consent_to_include_transcript,
    );
    if (consentHash(JSON.stringify(payload)) !== input.digest)
      throw new ConsentConflict();
    const claimed = { ...record, status: "processing" as const };
    await consentStore.replace(input.proposalId, raw, claimed);
    // Never release the claim after failure: database/network outcomes can be uncertain.
    const metadata = {
      consent_proposal_id: input.proposalId,
      consent_payload_digest: input.digest,
      consent_context_hash: context,
      consent_support_inbox: payload.supportInbox,
      consent_to_include_transcript: payload.consent_to_include_transcript,
      transcript_excerpt: payload.transcript_excerpt,
      verified_order_context: payload.order_id
        ? {
            order_id: payload.order_id,
            order_reference: payload.order_reference,
          }
        : null,
    };
    const ticket = await getSupportTicketModule(req).createConfirmedAiHandoff({
      ...payload,
      consent_proposal_id: input.proposalId,
      source: "ai_chat",
      product_id: null,
      metadata,
    });
    // The durable commit is authoritative. Cache failure must not hide the saved
    // ticket or prevent notification queuing. Preview reconciles from PostgreSQL.
    await consentStore
      .replace(input.proposalId, JSON.stringify(claimed), {
        context,
        expiresAt: record.expiresAt,
        status: "submitted",
        result: savedSupportResult(ticket, "pending"),
      })
      .catch(() => {
        req.scope
          .resolve("logger")
          .warn(
            "AI support ticket saved; consent cache completion needs review",
          );
      });
    const notificationStatus = await queueConfirmedSupportNotifications(
      req,
      ticket,
      payload.supportInbox,
    );
    const result = savedSupportResult(ticket, notificationStatus);
    return res.status(201).json(result);
  } catch (error) {
    return failure(res, error);
  }
}
