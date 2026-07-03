"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Smartphone, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { formatKES } from "@/lib/format";
import { fetchLoyaltyWallet } from "@/lib/api/portal";
import { readPortalCustomerPhone, usePortalCustomerStore } from "@/lib/store/portal-customer-store";

const TXN_KEY = "haus-portal-wallet-txns";

interface WalletTxn {
  id: string;
  type: "topup" | "credit" | "debit";
  amount: number;
  description: string;
  createdAt: string;
}

function readTxns(phone: string): WalletTxn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${TXN_KEY}-${phone}`);
    return raw ? (JSON.parse(raw) as WalletTxn[]) : [];
  } catch {
    return [];
  }
}

function saveTxns(phone: string, txns: WalletTxn[]) {
  localStorage.setItem(`${TXN_KEY}-${phone}`, JSON.stringify(txns));
}

export default function PortalWalletPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const storePhone = usePortalCustomerStore((s) => s.phone);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [topUpAmount, setTopUpAmount] = useState("");
  const [localTxns, setLocalTxns] = useState<WalletTxn[]>([]);

  useEffect(() => {
    const phone = readPortalCustomerPhone();
    setCustomerPhone(phone);
    if (phone) {
      setMpesaPhone(phone);
      setLocalTxns(readTxns(phone));
    }
    const unsub = usePortalCustomerStore.persist.onFinishHydration(() => {
      const hydrated = readPortalCustomerPhone();
      setCustomerPhone(hydrated);
      if (hydrated) {
        setMpesaPhone(hydrated);
        setLocalTxns(readTxns(hydrated));
      }
    });
    return unsub;
  }, [storePhone]);

  const walletQuery = useQuery({
    queryKey: ["portal-wallet", orgId, customerPhone],
    enabled: !!orgId && !!customerPhone,
    queryFn: () => fetchLoyaltyWallet(orgId, customerPhone!),
  });

  const loyaltyCredits = walletQuery.data?.loyalty_points ?? 0;
  const topUpTotal = localTxns
    .filter((t) => t.type === "topup")
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = loyaltyCredits + topUpTotal;

  const loyaltyTxns = useMemo<WalletTxn[]>(() => {
    if (!walletQuery.data || loyaltyCredits <= 0) return [];
    return [
      {
        id: "loyalty-balance",
        type: "credit",
        amount: loyaltyCredits,
        description: `Loyalty points (${walletQuery.data.loyalty_tier} tier)`,
        createdAt: new Date().toISOString(),
      },
    ];
  }, [walletQuery.data, loyaltyCredits]);

  const allTxns = useMemo(() => {
    return [...localTxns, ...loyaltyTxns].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [localTxns, loyaltyTxns]);

  const topUpMut = useMutation({
    mutationFn: async (amount: number) => {
      await new Promise((r) => setTimeout(r, 800));
      if (!customerPhone) throw new Error("No customer phone");
      const txn: WalletTxn = {
        id: crypto.randomUUID(),
        type: "topup",
        amount,
        description: `M-PESA top-up · ${mpesaPhone}`,
        createdAt: new Date().toISOString(),
      };
      const next = [txn, ...readTxns(customerPhone)];
      saveTxns(customerPhone, next);
      setLocalTxns(next);
    },
    onSuccess: () => {
      setTopUpAmount("");
      toast.success("M-PESA top-up successful (demo)");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Top-up failed"),
  });

  function onTopUp(e: FormEvent) {
    e.preventDefault();
    const amount = Number(topUpAmount);
    if (!amount || amount < 50) {
      toast.error("Minimum top-up is KES 50");
      return;
    }
    topUpMut.mutate(amount);
  }

  const body = !customerPhone ? (
    <Card className="glass">
      <CardContent className="space-y-4 py-10 text-center text-sm text-muted-foreground">
        <p>Book an appointment to activate your digital wallet.</p>
        <Button asChild className="bg-gradient-gold text-primary-foreground">
          <Link href="/portal/book">Book now</Link>
        </Button>
      </CardContent>
    </Card>
  ) : (
    <div className="space-y-6">
      <Card className="glass border-primary/20 bg-gradient-to-br from-primary/10 to-transparent" data-testid="portal-wallet-balance">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WalletIcon className="h-5 w-5 text-primary" />
            Digital wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {walletQuery.data?.full_name ?? "Your balance"}
          </p>
          <div className="flex items-end gap-2">
            <span className="font-heading text-4xl font-bold text-primary">{formatKES(balance)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Includes {loyaltyCredits} loyalty credits
            {topUpTotal > 0 ? ` + ${formatKES(topUpTotal)} top-ups` : ""}
          </p>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4 text-primary" />
            M-PESA top-up
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onTopUp}>
            <div className="space-y-1.5">
              <Label htmlFor="mpesa-phone">M-PESA phone</Label>
              <Input
                id="mpesa-phone"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="07xx xxx xxx"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topup-amount">Amount (KES)</Label>
              <Input
                id="topup-amount"
                type="number"
                min={50}
                step={50}
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="500"
                required
              />
            </div>
            <Button type="submit" disabled={topUpMut.isPending} className="bg-gradient-gold text-primary-foreground">
              {topUpMut.isPending ? "Processing…" : "Top up via M-PESA"}
            </Button>
            <p className="text-[10px] text-muted-foreground">Demo only — no real payment is processed.</p>
          </form>
        </CardContent>
      </Card>

      <section>
        <h3 className="mb-3 font-heading text-lg font-semibold">Transaction history</h3>
        {walletQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : allTxns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {allTxns.map((txn) => (
              <Card key={txn.id} className="glass">
                <CardContent className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-3">
                    {txn.type === "debit" ? (
                      <ArrowUpRight className="h-4 w-4 text-destructive" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4 text-green-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{txn.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(txn.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      txn.type === "debit" ? "text-destructive" : "text-green-600"
                    }`}
                  >
                    {txn.type === "debit" ? "−" : "+"}
                    {formatKES(txn.amount)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  return <AppShell title="Wallet">{body}</AppShell>;
}
