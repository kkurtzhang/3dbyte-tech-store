"use client"

import { useState } from "react";
import { StarRating } from "./star-rating";
import { ReviewForm } from "./review-form";
import { ReviewList } from "./review-list";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProductReviewsProps {
  productId: string;
  avgRating?: number;
  totalReviews?: number;
}

export function ProductReviews({ productId, avgRating = 0, totalReviews = 0 }: ProductReviewsProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleReviewSubmitted = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold">{avgRating.toFixed(1)}</div>
          <StarRating rating={Math.round(avgRating)} size={16} />
        </div>
        <Separator orientation="vertical" className="h-12" />
        <div>
          <div className="font-semibold">{totalReviews} Reviews</div>
          <div className="text-sm text-muted-foreground">
            {totalReviews > 0 ? "See what customers are saying" : "No reviews yet"}
          </div>
        </div>
      </div>

      <Separator />

      {/* Reviews Section */}
      <Tabs defaultValue="reviews" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="write">Write a Review</TabsTrigger>
        </TabsList>
        <TabsContent value="reviews" className="mt-6">
          <ReviewList key={refreshKey} productId={productId} />
        </TabsContent>
        <TabsContent value="write" className="mt-6">
          <ReviewForm productId={productId} onSuccess={handleReviewSubmitted} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
