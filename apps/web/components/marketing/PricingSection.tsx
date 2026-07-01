"use client";

import {
  CYCLE_LABELS,
  getMonthlyEquivalent,
  getPrice,
  getSavingsPercent,
  modeTerms,
  type BillingCycle,
} from "@haus/contracts";
import {
  Brain,
  Car,
  CheckCircle,
  Flower2,
  Gem,
  Scissors,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  UserCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { PLAN_CATALOG, PLATFORM_OPTIONS, type PlatformId } from "@/lib/plan-catalog";

const platformIcons = {
  barber: Scissors,
  beauty: Sparkles,
  spa: Flower2,
  nail_bar: Gem,
  clinic: Stethoscope,
  mobile: Car,
  therapy: Brain,
  solo_pro: UserCircle,
  products: ShoppingBag,
} as const;

const BILLING_CYCLES: BillingCycle[] = ["monthly", "quarterly", "annually"];

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformId[]>(["barber"]);

  const platformCount = Math.max(selectedPlatforms.length, 1);
  const savingsPercent = getSavingsPercent(billingCycle);

  const togglePlatform = (platform: PlatformId) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.length > 1
          ? prev.filter((id) => id !== platform)
          : prev
        : [...prev, platform],
    );
  };

  const platformSummary = useMemo(
    () =>
      selectedPlatforms
        .map((id) => modeTerms.brandLabels[id as keyof typeof modeTerms.brandLabels] ?? id)
        .join(", "),
    [selectedPlatforms],
  );

  return (
    <section id="pricing" className="relative overflow-hidden py-24 sm:py-32">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,hsl(var(--glow-gold)/0.1),transparent_70%)]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="label-eyebrow">Chapter 05 — Pricing</p>
          <h2 className="mt-3 font-display text-4xl font-normal leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Simple, <span className="italic text-gradient-aurora">transparent</span>, fair.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            One platform, nine specialised modes. Pick what you need — price scales with each mode you add.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {PLATFORM_OPTIONS.map((platform) => {
              const Icon = platformIcons[platform.id];
              const selected = selectedPlatforms.includes(platform.id);
              return (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => togglePlatform(platform.id)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                    selected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {platform.label}
                </button>
              );
            })}
          </div>
          {selectedPlatforms.length > 1 ? (
            <p className="mt-2 text-xs font-medium text-primary">
              {selectedPlatforms.length} platforms selected — {selectedPlatforms.length}× base price
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">{platformSummary}</p>
          )}

          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <div className="inline-flex items-center rounded-full border border-border bg-card p-1 gap-1">
              {BILLING_CYCLES.map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setBillingCycle(cycle)}
                  className={`relative rounded-full px-3 py-1.5 text-xs font-medium transition-all sm:px-4 sm:py-2 sm:text-sm ${
                    billingCycle === cycle
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {CYCLE_LABELS[cycle].label}
                  {cycle !== "monthly" ? (
                    <span className="ml-1 text-[10px] opacity-80 sm:text-xs sm:ml-1.5">
                      -{getSavingsPercent(cycle)}%
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 sm:mt-14 sm:gap-5 md:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:gap-5">
          {PLAN_CATALOG.map((plan) => {
            const totalPrice = getPrice(plan.plan, billingCycle, platformCount);
            const monthlyEq = getMonthlyEquivalent(plan.plan, billingCycle, platformCount);
            return (
              <div
                key={plan.plan}
                className={`relative flex flex-col rounded-2xl border p-5 transition-all sm:p-6 ${
                  plan.highlight
                    ? "border-primary bg-primary/5 shadow-gold md:scale-[1.02]"
                    : "border-border bg-card hover:border-primary/40"
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
                <h3 className="font-heading text-lg font-bold text-foreground sm:text-xl">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
                <div className="mt-4 sm:mt-6">
                  <span className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
                    KES {totalPrice.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">{CYCLE_LABELS[billingCycle].suffix}</span>
                </div>
                {billingCycle !== "monthly" ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    KES {monthlyEq.toLocaleString()}/mo · Save {savingsPercent}%
                  </p>
                ) : null}
                <p className="mt-1.5 text-sm font-medium text-primary sm:mt-2">{plan.trial}</p>
                <ul className="mt-5 flex-1 space-y-2.5 sm:mt-6 sm:space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={`mt-6 w-full sm:mt-8 ${
                    plan.highlight
                      ? "bg-gradient-gold text-primary-foreground font-semibold shadow-gold hover:opacity-90"
                      : ""
                  }`}
                  variant={plan.highlight ? "default" : "outline"}
                  size="lg"
                >
                  <Link href={`/register?plan=${plan.plan}`}>{plan.cta}</Link>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
