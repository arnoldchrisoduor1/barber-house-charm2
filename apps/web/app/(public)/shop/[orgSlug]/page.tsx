"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { modeTerms } from "@haus/contracts";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchPublicShopCatalog,
  publicShopCheckout,
  type ShopProduct,
} from "@/lib/api/shop";
import { formatKES } from "@/lib/format";

type CartLine = { product: ShopProduct; quantity: number };

const CART_KEY = "haus-shop-cart";

function readCart(slug: string): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${CART_KEY}:${slug}`);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

function writeCart(slug: string, lines: CartLine[]) {
  localStorage.setItem(`${CART_KEY}:${slug}`, JSON.stringify(lines));
}

export default function PublicShopPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug;
  const [category, setCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartLine[]>(() => readCart(orgSlug));
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fulfillment, setFulfillment] = useState("pickup");
  const [address, setAddress] = useState("");
  const [placed, setPlaced] = useState<string | null>(null);

  const catalogQuery = useQuery({
    queryKey: ["public-shop", orgSlug],
    queryFn: () => fetchPublicShopCatalog(orgSlug),
    enabled: !!orgSlug,
  });

  const products = catalogQuery.data?.products ?? [];
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  const filtered = category === "all" ? products : products.filter((p) => p.category === category);
  const total = cart.reduce((sum, l) => sum + l.product.price_kes * l.quantity, 0);

  function persist(next: CartLine[]) {
    setCart(next);
    writeCart(orgSlug, next);
  }

  function addToCart(product: ShopProduct) {
    const existing = cart.find((l) => l.product.id === product.id);
    if (existing) {
      persist(cart.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l)));
    } else {
      persist([...cart, { product, quantity: 1 }]);
    }
    toast.success(`Added ${product.name}`);
  }

  const checkoutMut = useMutation({
    mutationFn: () =>
      publicShopCheckout(orgSlug, {
        customer_name: name,
        customer_phone: phone,
        fulfillment_type: fulfillment,
        payment_method: "pay_on_pickup",
        delivery_address: fulfillment === "delivery" ? address : "",
        lines: cart.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
      }),
    onSuccess: (order) => {
      persist([]);
      setPlaced(order.order_number);
      toast.success(`Order ${order.order_number} placed`);
    },
    onError: (e: Error) => toast.error(e.message || "Checkout failed"),
  });

  const brand = modeTerms.brandLabels.products;

  if (placed) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center" data-testid="shop-order-success">
        <h1 className="font-heading text-2xl font-semibold">Order confirmed</h1>
        <p className="mt-2 text-muted-foreground">
          {placed} · pay on pickup. We&apos;ll have it ready shortly.
        </p>
        <Button type="button" className="mt-6" onClick={() => setPlaced(null)}>
          Continue shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen p-6 theme-products" data-testid="public-shop-page">
      <div className="mesh-aurora" aria-hidden />
      <div className="relative z-10 mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <header className="mb-6">
            <p className="label-eyebrow mb-1">{catalogQuery.data?.org.name ?? brand}</p>
            <h1 className="font-display text-3xl font-semibold">Shop</h1>
            <p className="text-sm text-muted-foreground">Browse products and checkout for pickup.</p>
          </header>

          <div className="mb-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={category === "all" ? "default" : "outline"} onClick={() => setCategory("all")}>
              All
            </Button>
            {categories.map((c) => (
              <Button
                key={c}
                type="button"
                size="sm"
                variant={category === c ? "default" : "outline"}
                onClick={() => setCategory(c)}
              >
                {c}
              </Button>
            ))}
          </div>

          {catalogQuery.isLoading ? (
            <p className="text-muted-foreground">Loading catalog…</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((p) => (
                <Card key={p.id} className="glass" data-testid={`shop-product-${p.id}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      <Link href={`/shop/${orgSlug}/${p.id}`} className="hover:text-primary">
                        {p.name}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground">{p.category || "General"}</p>
                    <p className="font-medium">{formatKES(p.price_kes)}</p>
                    <p className="text-xs text-muted-foreground">{p.quantity} in stock</p>
                    <Button type="button" size="sm" disabled={p.quantity < 1} onClick={() => addToCart(p)}>
                      Add to cart
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Card className="glass h-fit" data-testid="shop-cart">
          <CardHeader>
            <CardTitle className="text-base">Cart ({cart.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {cart.length === 0 ? (
              <p className="text-muted-foreground">Cart empty.</p>
            ) : (
              <>
                {cart.map((l) => (
                  <div key={l.product.id} className="flex justify-between gap-2">
                    <span>
                      {l.quantity}× {l.product.name}
                    </span>
                    <span>{formatKES(l.product.price_kes * l.quantity)}</span>
                  </div>
                ))}
                <p className="font-medium">Total {formatKES(total)}</p>
                <div className="space-y-2 border-t border-border/40 pt-3">
                  <div className="space-y-1">
                    <Label htmlFor="shop-name">Name</Label>
                    <Input id="shop-name" data-testid="shop-checkout-name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="shop-phone">Phone</Label>
                    <Input id="shop-phone" data-testid="shop-checkout-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Fulfillment</Label>
                    <Select value={fulfillment} onValueChange={setFulfillment}>
                      <SelectTrigger data-testid="shop-fulfillment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pickup">Pickup</SelectItem>
                        <SelectItem value="delivery">Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {fulfillment === "delivery" ? (
                    <div className="space-y-1">
                      <Label htmlFor="shop-address">Address</Label>
                      <Input id="shop-address" value={address} onChange={(e) => setAddress(e.target.value)} />
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    className="w-full"
                    data-testid="shop-checkout-submit"
                    disabled={!name || !phone || cart.length === 0 || checkoutMut.isPending}
                    onClick={() => checkoutMut.mutate()}
                  >
                    {checkoutMut.isPending ? "Placing…" : "Checkout (pay on pickup)"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
