"use client"

import { useEffect, useState } from "react";
import { StarRating } from "./star-rating";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ThumbsUp } from "lucide-react";
import { toast } from "@/lib/hooks/use-toast";

interface Review {
  id: string;
  rating: number;
  title: string;
  content: string;
  helpful_count: number;
  verified_purchase: boolean;
  created_at: string;
}

interface ReviewListProps {
  productId: string;
  limit?: number;
}

export function ReviewList({ productId, limit = 10 }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [markingHelpful, setMarkingHelpful] = useState<string | null>(null);

  const fetchReviews = async () => {
    try {
      const response = await fetch(
        `/store/reviews?product_id=${productId}&limit=${limit}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch reviews");
      }

      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markHelpful = async (reviewId: string) => {
    setMarkingHelpful(reviewId);

    try {
      const response = await fetch(`/store/reviews/${reviewId}/helpful`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to mark review as helpful");
      }

      // Update local state
      setReviews((prev) =>
        prev.map((review) =>
          review.id === reviewId
            ? { ...review, helpful_count: review.helpful_count + 1 }
            : review
        )
      );

      toast({
        title: "Success",
        description: "Thanks for your feedback!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to mark as helpful",
      });
    } finally {
      setMarkingHelpful(null);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId, limit]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse space-y-3">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-3 w-3/4 bg-muted rounded" />
            <div className="h-3 w-full bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No reviews yet. Be the first to review this product!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div key={review.id} className="border-b pb-6 last:border-b-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <StarRating rating={review.rating} />
                {review.verified_purchase && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                    Verified Purchase
                  </span>
                )}
              </div>
              <h3 className="font-semibold mb-1">{review.title}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {formatDistanceToNow(new Date(review.created_at), {
                  addSuffix: true,
                })}
              </p>
              <p className="text-sm leading-relaxed">{review.content}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markHelpful(review.id)}
              disabled={markingHelpful === review.id}
              className="shrink-0"
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              {review.helpful_count}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
