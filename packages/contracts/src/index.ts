import features from "../domain/features.json" with { type: "json" };
import modeTerms from "../domain/mode-terms.json" with { type: "json" };
import pricing from "../domain/pricing.json" with { type: "json" };

export { features, modeTerms, pricing };
export type { paths, components } from "./api-types.js";

export type FeatureKey = (typeof features.features)[number]["key"];
export type BusinessMode = keyof typeof modeTerms.modes;
export type SubscriptionPlan = keyof typeof pricing.baseMonthlyKES;

export function getPrice(
  plan: SubscriptionPlan,
  cycle: keyof typeof pricing.billingCycles,
  platformCount = 1
): number {
  const monthly = pricing.baseMonthlyKES[plan] * platformCount;
  const { months, discount } = pricing.billingCycles[cycle];
  return Math.round(monthly * months * (1 - discount));
}

export function getMonthlyEquivalent(
  plan: SubscriptionPlan,
  cycle: keyof typeof pricing.billingCycles,
  platformCount = 1
): number {
  const { months } = pricing.billingCycles[cycle];
  return Math.round(getPrice(plan, cycle, platformCount) / months);
}

export function getSavingsPercent(cycle: keyof typeof pricing.billingCycles): number {
  return Math.round(pricing.billingCycles[cycle].discount * 100);
}

export const CYCLE_LABELS = {
  monthly: { label: "Monthly", suffix: "/mo" },
  quarterly: { label: "Quarterly", suffix: "/quarter" },
  annually: { label: "Annually", suffix: "/year" },
} as const;

export type BillingCycle = keyof typeof pricing.billingCycles;

export function planRank(plan: SubscriptionPlan): number {
  return pricing.baseMonthlyKES
    ? (["solo_pro", "starter", "professional", "enterprise"] as const).indexOf(plan)
    : -1;
}

export function hasFeature(plan: SubscriptionPlan | undefined, key: string): boolean {
  if (!plan) return false;
  const entry = features.features.find((f) => f.key === key);
  if (!entry) return false;
  const min = entry.minPlan as SubscriptionPlan;
  return planRank(plan) >= planRank(min);
}
