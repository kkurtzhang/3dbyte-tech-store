import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const waitlistModule = req.scope.resolve<any>("waitlist");
  const customerId = (req as any).auth_context?.actor_id;
  const { id } = req.params;

  if (!customerId) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const items = await waitlistModule.listWaitlistEntries({
      id,
      customer_id: customerId,
    });

    if (items.length === 0) {
      return res.status(404).json({
        message: "Waitlist item not found",
      });
    }

    await waitlistModule.deleteWaitlistEntries(id);

    res.status(200).json({
      message: "Removed from waitlist",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to remove from waitlist",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
