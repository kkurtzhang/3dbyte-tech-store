import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError, Modules } from "@medusajs/framework/utils";
import { timingSafeEqual } from "crypto";

interface KarrioWebhookPayload {
  event: string;
  data: {
    id?: string;
    tracking_number?: string;
    carrier_name?: string;
    status?: string;
    estimated_delivery?: string;
    events?: Array<{
      date: string;
      description: string;
      location?: string;
      code?: string;
    }>;
    delivered?: boolean;
    signed_by?: string;
  };
}

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> => {
  const webhookSecret = process.env.KARRIO_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "KARRIO_WEBHOOK_SECRET is not configured",
    );
  }

  const receivedSecret = req.headers["x-karrio-signature"] as string;
  if (
    !receivedSecret ||
    !timingSafeEqual(Buffer.from(webhookSecret), Buffer.from(receivedSecret))
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Invalid webhook signature",
    );
  }

  const payload = req.body as KarrioWebhookPayload;

  if (!payload?.event || !payload?.data) {
    res.status(400).json({ error: "Invalid webhook payload" });
    return;
  }

  if (!payload.event.startsWith("tracker.")) {
    res.json({ received: true, skipped: true });
    return;
  }

  const {
    tracking_number,
    status,
    events,
    estimated_delivery,
    delivered,
    signed_by,
  } = payload.data;

  if (!tracking_number) {
    res.json({ received: true, skipped: true, reason: "No tracking number" });
    return;
  }

  try {
    const query = req.scope.resolve("query");

    const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT);
    const allFulfillments = await (fulfillmentModule as any).listFulfillments(
      { provider_id: "karrio_karrio" },
      { select: ["id", "data"] },
    );

    const matchedFulfillments = (allFulfillments || []).filter(
      (f: any) =>
        (f.data as Record<string, unknown>)?.tracking_number ===
        tracking_number,
    );

    if (matchedFulfillments.length === 0) {
      res.json({ received: true, matched: false });
      return;
    }

    for (const fulfillment of matchedFulfillments) {
      const existingData = (fulfillment.data || {}) as Record<string, unknown>;

      const lastEventId = (existingData.last_karrio_event_id as string) || "";
      const currentEventId = payload.data.id || "";
      if (lastEventId === currentEventId && currentEventId !== "") {
        continue;
      }

      await (fulfillmentModule as any).updateFulfillment(fulfillment.id, {
        data: {
          ...existingData,
          karrio_tracking_status: status,
          karrio_tracking_events: events,
          karrio_estimated_delivery: estimated_delivery,
          karrio_delivered: delivered,
          karrio_signed_by: signed_by,
          last_karrio_event_id: currentEventId,
          karrio_updated_at: new Date().toISOString(),
        },
      });
    }

    res.json({
      received: true,
      matched: true,
      updated: matchedFulfillments.length,
    });
  } catch (error) {
    if (error instanceof MedusaError) {
      throw error;
    }
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Failed to process Karrio webhook: ${error}`,
    );
  }
};
