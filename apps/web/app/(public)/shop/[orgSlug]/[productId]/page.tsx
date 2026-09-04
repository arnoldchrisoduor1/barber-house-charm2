"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchPublicShopProduct } from "@/lib/api/shop";
import { formatKES } from "@/lib/format";

export default function PublicShopPDPPage() {
  const params = useParams<{ orgSlug: string; productId: string }>();
  const query = useQuery({
    queryKey: ["public-shop-pdp", params.orgSlug, params.productId],
    queryFn: () => fetchPublicShopProduct(params.orgSlug, params.productId),
    enabled: !!params.orgSlug && !!params.productId,
  });

  const p = query.data;

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6" data-testid="shop-pdp-page">
      <Button type="button" variant="outline" size="sm" asChild className="mb-4">
        <Link href={`/shop/${params.orgSlug}`}>← Back to shop</Link>
      </Button>
      {query.isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !p ? (
        <p className="text-destructive">Product not found.</p>
      ) : (
        <Card className="glass">
          <CardHeader>
            <CardTitle>{p.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">{p.category}</p>
            <p>{p.description || "No description."}</p>
            <p className="text-lg font-semibold">{formatKES(p.price_kes)}</p>
            <p className="text-xs text-muted-foreground">SKU {p.sku} · {p.quantity} in stock</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
