import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

type AddToWishlistRequest = {
  product_id: string;
  product_variant_id?: string;
};

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const wishlistModule = req.scope.resolve<any>("wishlistModuleService");
  const customerId = (req as any).auth?.actor_id;

  if (!customerId) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const wishlistItems = await wishlistModule.listWishlists({
      customer_id: customerId,
    });

    res.json({
      wishlist: wishlistItems,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch wishlist",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function POST(
  req: MedusaRequest<AddToWishlistRequest>,
  res: MedusaResponse
) {
  const wishlistModule = req.scope.resolve<any>("wishlistModuleService");
  const customerId = (req as any).auth?.actor_id;

  if (!customerId) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const { product_id, product_variant_id } = req.body;

  if (!product_id) {
    return res.status(400).json({
      message: "product_id is required",
    });
  }

  try {
    // Check if item already exists
    const existingItems = await wishlistModule.listWishlists({
      customer_id: customerId,
      product_id: product_id,
      product_variant_id: product_variant_id || null,
    });

    if (existingItems.length > 0) {
      return res.status(400).json({
        message: "Product already in wishlist",
      });
    }

    const wishlistItem = await wishlistModule.createWishlists({
      customer_id: customerId,
      product_id: product_id,
      product_variant_id: product_variant_id || null,
    });

    res.status(201).json({
      wishlist: wishlistItem,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to add to wishlist",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
