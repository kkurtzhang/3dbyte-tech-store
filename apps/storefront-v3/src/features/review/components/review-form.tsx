"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "./star-rating";
import { toast } from "@/lib/hooks/use-toast";

interface ReviewFormProps {
  productId: string;
  onSuccess?: () => void;
}

export function ReviewForm({ productId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a rating",
      });
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/store/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          product_id: productId,
          rating,
          title,
          content,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to submit review");
      }

      toast({
        title: "Success",
        description: "Your review has been submitted",
      });

      // Reset form
      setRating(0);
      setTitle("");
      setContent("");
      onSuccess?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit review",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Rating</Label>
        <div className="flex items-center gap-2">
          <StarRating
            rating={hoverRating || rating}
            size={24}
            className="cursor-pointer"
          />
          <span className="text-sm text-muted-foreground">
            {rating > 0 ? `${rating} star${rating > 1 ? "s" : ""}` : "Select a rating"}
          </span>
        </div>
        {/* Invisible star interaction layer */}
        <div className="flex items-center gap-0.5 -mt-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <div
              key={star}
              className="w-6 h-6 cursor-pointer"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="Summarize your experience"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Review</Label>
        <Textarea
          id="content"
          placeholder="Tell us about your experience with this product"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          required
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Review"}
      </Button>
    </form>
  );
}
