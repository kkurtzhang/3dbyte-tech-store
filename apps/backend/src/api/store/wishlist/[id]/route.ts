import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const wishlistModule = req.scope.resolve<any>("wishlistModuleService");
  const customerId = (req as any).auth?.actor_id;
  const { id } = req.params;

  if (!customerId) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    // First check if the item belongs to the customer
    const items = await wishlistModule.listWishlists({
      id: id,
      customer_id: customerId,
    });

    if (items.length === 0) {
      return res.status(404).json({
        message: "Wishlist item not found",
      });
    }

    await wishlistModule.deleteWishlists(id);

    res.status(200).json({
      message: "Removed from wishlist",
      id: id,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to remove from wishlist",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
