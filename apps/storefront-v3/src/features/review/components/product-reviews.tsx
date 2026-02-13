"use client"

import { useState } from "react"
import { StarRating } from "../components/star-rating"
import { Separator } from "@/components/ui/separator"
import { useSession } from "@/lib/providers/session-provider"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star } from "lucide-react"

// Mock review data
interface Review {
  id: string
  author: string
  rating: number
  date: string
  title: string
  content: string
  verified: boolean
}

const mockReviews: Review[] = [
  {
    id: "1",
    author: "Alex Johnson",
    rating: 5,
    date: "2024-01-15",
    title: "Excellent product, highly recommend!",
    content: "This product exceeded my expectations. The quality is outstanding and delivery was fast. I've been using it for a month now and couldn't be happier with my purchase.",
    verified: true,
  },
  {
    id: "2",
    author: "Sarah Miller",
    rating: 4,
    date: "2024-01-10",
    title: "Great value for money",
    content: "Good product overall. Some minor issues with the packaging but the product itself works great. Would buy again.",
    verified: true,
  },
  {
    id: "3",
    author: "Mike Chen",
    rating: 5,
    date: "2024-01-05",
    title: "Perfect for my needs",
    content: "Exactly what I was looking for. The build quality is impressive and it performs exactly as described. Customer service was also very helpful.",
    verified: true,
  },
  {
    id: "4",
    author: "Emily Davis",
    rating: 3,
    date: "2023-12-28",
    title: "Decent but could be better",
    content: "It's okay, nothing special. The product works but I expected a bit more for the price. Shipping was fast though.",
    verified: false,
  },
]

interface ProductReviewsProps {
  productId: string
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { user, isAuthenticated } = useSession()
  const [reviews, setReviews] = useState<Review[]>(mockReviews)
  const [showForm, setShowForm] = useState(false)
  const [newReview, setNewReview] = useState({
    rating: 0,
    title: "",
    content: "",
  })
  const [hoverRating, setHoverRating] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculate average rating
  const averageRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
  const totalReviews = reviews.length
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
    percentage: (reviews.filter((r) => r.rating === rating).length / reviews.length) * 100,
  }))

  const handleSubmitReview = async () => {
    if (newReview.rating === 0 || !newReview.title || !newReview.content) {
      return
    }

    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const review: Review = {
      id: Date.now().toString(),
      author: user?.first_name && user?.last_name 
        ? `${user.first_name} ${user.last_name}` 
        : user?.email || "Anonymous",
      rating: newReview.rating,
      date: new Date().toISOString().split("T")[0],
      title: newReview.title,
      content: newReview.content,
      verified: false,
    }

    setReviews([review, ...reviews])
    setNewReview({ rating: 0, title: "", content: "" })
    setShowForm(false)
    setIsSubmitting(false)
  }

  return (
    <div className="mt-16">
      <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>

      {/* Rating Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Average Rating */}
        <div className="text-center md:text-left">
          <div className="text-5xl font-bold mb-2">{averageRating.toFixed(1)}</div>
          <StarRating rating={Math.round(averageRating)} size={24} className="justify-center md:justify-start mb-2" />
          <p className="text-muted-foreground">Based on {totalReviews} reviews</p>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-2">
          {ratingDistribution.map(({ rating, count, percentage }) => (
            <div key={rating} className="flex items-center gap-2">
              <span className="text-sm w-3">{rating}</span>
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground w-8">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Write Review Button */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Recent Reviews</h3>
        {isAuthenticated && !showForm && (
          <Button onClick={() => setShowForm(true)} variant="outline">
            Write a Review
          </Button>
        )}
        {!isAuthenticated && (
          <p className="text-sm text-muted-foreground">
            <Button variant="link" className="p-0 h-auto" onClick={() => window.dispatchEvent(new CustomEvent('open-auth'))}>
              Sign in
            </Button>{" "}
            to write a review
          </p>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <div className="bg-muted/30 p-6 rounded-lg border mb-8">
          <h4 className="font-semibold mb-4">Write Your Review</h4>
          
          {/* Star Rating Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Your Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setNewReview({ ...newReview, rating: star })}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    size={28}
                    className={`transition-colors ${
                      star <= (hoverRating || newReview.rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "fill-transparent text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {newReview.rating === 0 && (
              <p className="text-sm text-red-500 mt-1">Please select a rating</p>
            )}
          </div>

          {/* Review Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Review Title</label>
            <input
              type="text"
              placeholder="Summarize your review"
              value={newReview.title}
              onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-md bg-background"
            />
          </div>

          {/* Review Content */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Your Review</label>
            <Textarea
              placeholder="Share your experience with this product"
              value={newReview.content}
              onChange={(e) => setNewReview({ ...newReview, content: e.target.value })}
              rows={4}
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleSubmitReview}
              disabled={isSubmitting || newReview.rating === 0 || !newReview.title || !newReview.content}
            >
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.map((review) => (
          <div key={review.id} className="border-b pb-6 last:border-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{review.author}</span>
                  {review.verified && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Verified Purchase
                    </span>
                  )}
                </div>
                <StarRating rating={review.rating} size={14} />
              </div>
              <span className="text-sm text-muted-foreground">
                {new Date(review.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <h4 className="font-semibold mb-1">{review.title}</h4>
            <p className="text-muted-foreground">{review.content}</p>
          </div>
        ))}
      </div>

      {/* Load More */}
      {reviews.length > 4 && (
        <div className="text-center mt-6">
          <Button variant="outline">Load More Reviews</Button>
        </div>
      )}
    </div>
  )
}
