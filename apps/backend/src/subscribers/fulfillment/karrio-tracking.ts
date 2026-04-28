import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { KARRIO_MODULE } from "../../modules/karrio";
import type KarrioModuleService from "../../modules/karrio/service";

/**
 * Fulfillment Created — Karrio Tracker
 *
 * When a fulfillment is created via the Karrio provider, this subscriber
 * registers a tracker in Karrio so that live tracking events are available
 * for the order tracking endpoint.
 *
 * Fulfillments without Karrio metadata (e.g. manual_manual) are skipped.
 */
export default async function karrioTrackingHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger");

  const fulfillmentId = data.id;
  if (!fulfillmentId) {
    return;
  }

  try {
    const query = container.resolve("query");

    const { data: fulfillments } = await query.graph({
      entity: "fulfillment",
      fields: ["id", "data", "provider_id"],
      filters: { id: fulfillmentId },
    });

    const fulfillment = fulfillments?.[0];
    if (!fulfillment) {
      logger.warn(
        `karrio-tracking subscriber: Fulfillment ${fulfillmentId} not found, skipping`
      );
      return;
    }

    const fulfillmentData = fulfillment.data as Record<string, unknown> | undefined;
    const shipmentId = fulfillmentData?.karrio_shipment_id as string | undefined;

    if (!shipmentId) {
      // Not a Karrio fulfillment — nothing to do
      return;
    }

    const trackingNumber =
      (fulfillmentData?.tracking_number as string) || null;

    const carrierName = (fulfillmentData?.carrier_name as string) || "";

    if (!trackingNumber || !carrierName) {
      logger.warn(
        `karrio-tracking subscriber: Missing tracking_number or carrier_name for fulfillment ${fulfillmentId}, skipping tracker creation`
      );
      return;
    }

    const karrioService = container.resolve(KARRIO_MODULE) as KarrioModuleService;
    const tracker = await karrioService.createTracker(trackingNumber, carrierName);

    logger.info(
      `karrio-tracking subscriber: Created Karrio tracker ${tracker.id} for fulfillment ${fulfillmentId} (${trackingNumber} via ${carrierName})`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(
      `karrio-tracking subscriber: Failed to create tracker for fulfillment ${fulfillmentId}: ${message}`
    );
    // Errors are logged but do not propagate — tracker creation is non-critical
  }
}

export const config: SubscriberConfig = {
  event: "fulfillment.created",
};
