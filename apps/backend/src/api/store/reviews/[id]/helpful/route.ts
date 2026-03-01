import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { REVIEWS_MODULE } from "../../../../../modules/reviews";

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const reviewsModule = req.scope.resolve<any>("reviewsModuleService");
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      message: "review id is required",
    });
  }

  try {
    // Get the current review
    const reviews = await reviewsModule.listReviews({ id: id });

    if (reviews.length === 0) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    const review = reviews[0];

    // Increment helpful count
    const updatedReview = await reviewsModule.updateReviews(id, {
      helpful_count: review.helpful_count + 1,
    });

    res.json({
      review: updatedReview,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to mark review as helpful",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
