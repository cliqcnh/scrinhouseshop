"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { toast } from "sonner";
import { Star, CheckCircle2, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/format";
import { createProductReview, type ProductReviewItem } from "@/actions/storefront/reviews";

export function ProductReviews({
  productId,
  initialReviews,
}: {
  productId: string;
  initialReviews: ProductReviewItem[];
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [isWriting, setIsWriting] = useState(false);

  const [userName, setUserName] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [loading, setLoading] = useState(false);

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : "5.0";

  function handleFileRead(file: File) {
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Photo size must be under 3MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImageUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !comment) {
      toast.error("Please enter both a title and review comment.");
      return;
    }

    setLoading(true);
    try {
      const res = await createProductReview({
        productId,
        userName: userName || "Customer",
        rating,
        title,
        comment,
        images: imageUrl ? [imageUrl] : [],
      });

      if (!res.success) {
        toast.error(res.error ?? "Failed to submit review");
        return;
      }

      toast.success("Review published successfully!");
      setReviews((prev) => [
        {
          id: Math.random().toString(),
          userName: userName || "Customer",
          rating,
          title,
          comment,
          images: imageUrl ? [imageUrl] : [],
          isVerifiedPurchase: true,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);

      setIsWriting(false);
      setTitle("");
      setComment("");
      setImageUrl("");
    } catch {
      toast.error("Error submitting product review.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-12 border-t border-border pt-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
            Customer Reviews &amp; Ratings
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center text-amber-500">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="size-4 fill-amber-500 text-amber-500" />
              ))}
            </div>
            <span className="text-sm font-bold text-foreground">{avgRating} out of 5</span>
            <span className="text-xs text-muted-foreground">({reviews.length} reviews)</span>
          </div>
        </div>

        <Button
          onClick={() => setIsWriting((p) => !p)}
          variant="outline"
          className="rounded-none text-xs font-semibold uppercase tracking-wider"
        >
          {isWriting ? "Cancel Review" : "Write a Review"}
        </Button>
      </div>

      {/* Write Review Form */}
      {isWriting && (
        <form onSubmit={handleSubmitReview} className="border border-border p-6 bg-white space-y-4">
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground border-b border-border pb-3">
            Submit Your Review
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="rev-name" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Your Name</label>
              <input
                id="rev-name"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Kwame Mensah"
                className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Rating</label>
              <div className="flex items-center gap-1.5 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 focus:outline-none"
                  >
                    <Star
                      className={`size-6 ${
                        star <= rating ? "fill-amber-500 text-amber-500" : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="rev-title" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Headline / Review Title *</label>
            <input
              id="rev-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Pristine UK Used Condition & Fast Delivery!"
              className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none"
            />
          </div>

          <div>
            <label htmlFor="rev-comment" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Detailed Review *</label>
            <textarea
              id="rev-comment"
              rows={3}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your feedback about battery health, screen condition, delivery experience..."
              className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none resize-none"
            />
          </div>

          <div>
            <label htmlFor="rev-photo" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Attach Photo of Product <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="rev-photo"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileRead(f);
              }}
              className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-none file:border file:border-border file:bg-white file:text-xs file:font-semibold cursor-pointer"
            />
            {imageUrl && (
              <div className="mt-2 flex items-center gap-2 text-xs text-green-600 font-semibold">
                <ImageIcon className="size-4" /> Photo attached!
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-none bg-foreground text-background text-xs font-bold uppercase tracking-wider py-2.5 h-auto"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin mr-2" /> : null}
            Publish Review
          </Button>
        </form>
      )}

      {/* Review List */}
      {reviews.length === 0 ? (
        <div className="border border-border p-8 text-center text-xs text-muted-foreground bg-[#fcfcfc]">
          No customer reviews for this item yet. Be the first to leave a review!
        </div>
      ) : (
        <div className="divide-y divide-border border-t border-border">
          {reviews.map((rev) => (
            <div key={rev.id} className="py-6 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`size-3.5 ${
                          s <= rev.rating ? "fill-amber-500 text-amber-500" : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-bold text-foreground text-sm">{rev.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(rev.createdAt)}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{rev.userName}</span>
                {rev.isVerifiedPurchase && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5">
                    <CheckCircle2 className="size-3 text-green-600" /> Verified Buyer
                  </span>
                )}
              </div>

              <p className="text-xs text-foreground leading-relaxed pt-1">{rev.comment}</p>

              {rev.images.length > 0 && (
                <div className="flex gap-2 pt-2">
                  {rev.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt="Customer upload"
                      className="size-20 object-cover border border-border"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
