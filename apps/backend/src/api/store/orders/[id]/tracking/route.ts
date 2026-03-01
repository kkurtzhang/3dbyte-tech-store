import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { Modules } from "@medusajs/framework/utils";

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const { id } = req.params;
  const query = req.scope.resolve("query");

  try {
    // Fetch the order with fulfillment details
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "status",
        "items.*",
        "fulfillments.*",
        "fulfillments.tracking_numbers",
        "fulfillments.metadata",
        "shipping_address.*",
        "created_at",
        "updated_at",
      ],
      filters: {
        id,
      },
    });

    if (!orders || orders.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Order not found"
      );
    }

    const order = orders[0];

    // Build tracking information from fulfillments
    const trackingInfo = order.fulfillments?.map((fulfillment: any) => {
      const trackingNumber = fulfillment.tracking_numbers?.[0] || null;
      const carrier = fulfillment.metadata?.carrier || "Standard Shipping";
      const carrierLink = fulfillment.metadata?.carrier_link || null;

      return {
        id: fulfillment.id,
        tracking_number: trackingNumber,
        carrier: carrier,
        carrier_link: carrierLink,
        status: mapFulfillmentStatusToFriendly(fulfillment.status),
        created_at: fulfillment.created_at,
        updated_at: fulfillment.updated_at,
      };
    }) || [];

    // Derive fulfillment status from fulfillments
    const hasFulfillments = order.fulfillments && order.fulfillments.length > 0;
    const fulfillmentStatus = hasFulfillments ? "fulfilled" : "not_fulfilled";

    // Determine overall tracking status
    const overallStatus = getOverallTrackingStatus(fulfillmentStatus, order.status);

    res.json({
      order_id: order.id,
      order_status: order.status,
      fulfillment_status: fulfillmentStatus,
      tracking_status: overallStatus,
      tracking_info: trackingInfo,
      shipping_address: order.shipping_address,
      created_at: order.created_at,
      updated_at: order.updated_at,
    });
  } catch (error) {
    if (error instanceof MedusaError) {
      throw error;
    }
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Failed to fetch tracking information: ${error}`
    );
  }
};

/**
 * Map Medusa fulfillment status to user-friendly status
 */
function mapFulfillmentStatusToFriendly(status: string): string {
  switch (status) {
    case "not_fulfilled":
      return "Processing";
    case "fulfilled":
      return "Preparing for Shipment";
    case "partially_fulfilled":
      return "Partially Shipped";
    case "shipped":
      return "Shipped";
    case "partially_shipped":
      return "Partially Shipped";
    case "delivered":
      return "Delivered";
    case "canceled":
      return "Canceled";
    default:
      return status;
  }
}

/**
 * Get overall tracking status based on fulfillment and order status
 */
function getOverallTrackingStatus(fulfillmentStatus: string, orderStatus: string): string {
  // Priority-based status determination
  if (orderStatus === "canceled") return "canceled";
  if (fulfillmentStatus === "delivered") return "delivered";
  if (fulfillmentStatus === "shipped" || fulfillmentStatus === "partially_shipped") return "shipped";
  if (fulfillmentStatus === "fulfilled" || fulfillmentStatus === "partially_fulfilled") return "processing";
  if (fulfillmentStatus === "not_fulfilled") return "processing";
  return "processing";
}
