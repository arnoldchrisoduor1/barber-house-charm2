"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Feature } from "@/components/Feature";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { fetchLoyaltyWallet, fetchMyReviews, submitReview } from "@/lib/api/portal";
import { readPortalCustomerPhone, usePortalCustomerStore } from "@/lib/store/portal-customer-store";

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="rounded p-0.5 transition hover:scale-110"
          aria-label={`${n} stars`}
        >
          <Star
            className={`h-6 w-6 ${n <= value ? "fill-primary text-primary" : "text-muted-foreground"}`}
          />
        </button>
      ))}
    </div>
  );
}

export default function PortalReviewsPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const storePhone = usePortalCustomerStore((s) => s.phone);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const qc = useQueryClient();

  useEffect(() => {
    setCustomerPhone(readPortalCustomerPhone());
    const unsub = usePortalCustomerStore.persist.onFinishHydration(() => {
      setCustomerPhone(readPortalCustomerPhone());
    });
    return unsub;
  }, [storePhone]);

  const walletQuery = useQuery({
    queryKey: ["portal-wallet", orgId, customerPhone],
    enabled: !!orgId && !!customerPhone,
    queryFn: () => fetchLoyaltyWallet(orgId, customerPhone!),
  });

  const reviewsQuery = useQuery({
    queryKey: ["portal-reviews", orgId, customerPhone],
    enabled: !!orgId && !!customerPhone,
    queryFn: () => fetchMyReviews(orgId, customerPhone!),
  });

  const submitMut = useMutation({
    mutationFn: () =>
      submitReview(orgId, {
        customer_id: walletQuery.data!.customer_id,
        rating,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-reviews", orgId] });
      setComment("");
      setRating(5);
      toast.success("Review submitted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Submit failed"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!walletQuery.data?.customer_id) return;
    submitMut.mutate();
  }

  const body = !customerPhone ? (
    <Card className="glass">
      <CardContent className="space-y-4 py-10 text-center text-sm text-muted-foreground">
        <p>Book a visit first to leave a review.</p>
        <Button asChild className="bg-gradient-gold text-primary-foreground">
          <Link href="/portal/book">Book now</Link>
        </Button>
      </CardContent>
    </Card>
  ) : (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="glass">
        <CardHeader>
          <CardTitle>Leave a review</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>Rating</Label>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-comment">Comment</Label>
              <Textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience…"
                rows={4}
              />
            </div>
            <Button type="submit" disabled={submitMut.isPending}>
              Submit review
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Your reviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviewsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (reviewsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            (reviewsQuery.data ?? []).map((review) => (
              <div key={review.id} className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="mb-1 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < review.rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                    />
                  ))}
                </div>
                {review.comment ? <p className="text-sm">{review.comment}</p> : null}
                {review.created_at ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {review.created_at.slice(0, 10)}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AppShell title="Reviews">
      <Feature flag="customer_reviews">{body}</Feature>
    </AppShell>
  );
}
