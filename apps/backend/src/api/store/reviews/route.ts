import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { REVIEWS_MODULE } from "../../../modules/reviews";

type CreateReviewRequest = {
  product_id: string;
  product_variant_id?: string;
  rating: number;
  title: string;
  content: string;
};

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const reviewsModule = req.scope.resolve<any>("reviewsModuleService");
  const { product_id, limit = 10, offset = 0 } = req.query;

  if (!product_id) {
    return res.status(400).json({
      message: "product_id is required",
    });
  }

  try {
    const reviews = await reviewsModule.listReviews(
      { product_id: product_id as string },
      { order: { created_at: "DESC" }, take: Number(limit), skip: Number(offset) }
    );

    // Calculate average rating
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviews.length
      : 0;

    res.json({
      reviews,
      count: reviews.length,
      avg_rating: Math.round(avgRating * 10) / 10,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch reviews",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function POST(
  req: MedusaRequest<CreateReviewRequest>,
  res: MedusaResponse
) {
  const reviewsModule = req.scope.resolve<any>("reviewsModuleService");
  const customerId = (req as any).auth?.actor_id;

  const { product_id, product_variant_id, rating, title, content } = req.body;

  if (!product_id || !rating || !title || !content) {
    return res.status(400).json({
      message: "product_id, rating, title, and content are required",
    });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({
      message: "rating must be between 1 and 5",
    });
  }

  try {
    // Check if customer already reviewed this product
    const existingReviews = await reviewsModule.listReviews({
      customer_id: customerId,
      product_id: product_id,
    });

    if (existingReviews.length > 0) {
      return res.status(400).json({
        message: "You have already reviewed this product",
      });
    }

    const review = await reviewsModule.createReviews({
      customer_id: customerId,
      product_id: product_id,
      product_variant_id: product_variant_id || null,
      rating: rating,
      title: title,
      content: content,
      verified_purchase: false, // Can be enhanced to check actual orders
    });

    res.status(201).json({
      review,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create review",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
