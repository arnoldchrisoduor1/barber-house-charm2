"use client";

import {
  CYCLE_LABELS,
  getMonthlyEquivalent,
  getPrice,
  getSavingsPercent,
  type BillingCycle,
  type SubscriptionPlan,
} from "@haus/contracts";
import { CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import { PLAN_CATALOG } from "@/lib/plan-catalog";

const BILLING_CYCLES: BillingCycle[] = ["monthly", "quarterly", "annually"];

export default function SelectPlanPage() {
  const router = useRouter();
  const { me, isAuthenticated, isLoading, refreshMe } = useAuth();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPlan = (me?.subscription?.plan ?? "starter") as SubscriptionPlan;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login?next=/select-plan");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    const orgId = me?.activeOrg?.id;
    if (!orgId) {
      setError("No organization found. Please contact support.");
      return;
    }

    setLoadingPlan(plan);
    setError(null);
    try {
      await api.patch(`/organizations/${orgId}/subscription`, { plan });
      await refreshMe();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update plan");
    } finally {
      setLoadingPlan(null);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading plans…</p>
      </div>
    );
  }

  const savingsPercent = getSavingsPercent(billingCycle);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-12">
      <div className="mesh-ambient" aria-hidden />
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="text-center">
          <p className="label-eyebrow">Upgrade</p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">
            Choose your <span className="italic text-gradient-aurora">plan</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Switch plans instantly for testing — no payment required. Your current plan is{" "}
            <span className="font-semibold capitalize text-foreground">{currentPlan.replace("_", " ")}</span>.
          </p>
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            All plans include a 7-day free trial. No payment required to switch.
          </p>
          <div className="mt-4 inline-flex items-center rounded-full border border-border bg-card p-1 gap-1">
            {BILLING_CYCLES.map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setBillingCycle(cycle)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  billingCycle === cycle
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {CYCLE_LABELS[cycle].label}
                {cycle !== "monthly" ? (
                  <span className="ml-1.5 text-xs opacity-80">Save {getSavingsPercent(cycle)}%</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {PLAN_CATALOG.map((plan) => {
            const totalPrice = getPrice(plan.plan, billingCycle, 1);
            const monthlyEq = getMonthlyEquivalent(plan.plan, billingCycle, 1);
            const isCurrent = plan.plan === currentPlan;
            return (
              <div
                key={plan.plan}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  plan.highlight
                    ? "border-primary bg-primary/5 shadow-gold md:scale-[1.02]"
                    : "border-border bg-card"
                }`}
              >
                {plan.highlight ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                    Most Popular
                  </span>
                ) : null}
                {plan.badge ? (
                  <span className="absolute -top-3 right-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                    {plan.badge}
                  </span>
                ) : null}
                <h2 className="font-heading text-xl font-bold">{plan.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
                <div className="mt-4">
                  <span className="font-heading text-3xl font-bold">KES {totalPrice.toLocaleString()}</span>
                  <span className="text-muted-foreground">{CYCLE_LABELS[billingCycle].suffix}</span>
                </div>
                {billingCycle !== "monthly" ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    KES {monthlyEq.toLocaleString()}/mo · Save {savingsPercent}%
                  </p>
                ) : null}
                <p className="mt-2 text-sm font-medium text-primary">{plan.trial}</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`mt-6 w-full ${
                    plan.highlight ? "bg-gradient-gold text-primary-foreground font-semibold shadow-gold hover:opacity-90" : ""
                  }`}
                  variant={plan.highlight ? "default" : "outline"}
                  size="lg"
                  disabled={!!loadingPlan || isCurrent}
                  onClick={() => handleSelectPlan(plan.plan)}
                >
                  {loadingPlan === plan.plan ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    "Current plan"
                  ) : (
                    `Switch to ${plan.name}`
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Button variant="ghost" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
