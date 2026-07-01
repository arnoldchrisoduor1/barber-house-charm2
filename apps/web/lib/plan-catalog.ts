import type { SubscriptionPlan } from "@haus/contracts";

export type PlanCatalogEntry = {
  name: string;
  plan: SubscriptionPlan;
  desc: string;
  trial: string;
  cta: string;
  highlight: boolean;
  badge?: string;
  features: string[];
};

export const PLAN_CATALOG: PlanCatalogEntry[] = [
  {
    name: "Solo Pro",
    plan: "solo_pro",
    trial: "7-day free trial",
    cta: "Start Free Trial",
    highlight: false,
    badge: "Solo",
    desc: "For independent professionals working solo.",
    features: [
      "1 professional seat",
      "Online booking page",
      "Client management & CRM",
      "Schedule management",
      "POS & payment processing",
      "Inventory & stock tracking",
      "Waitlist & queue management",
      "Loyalty program & rewards",
      "Service packages & gift cards",
      "Basic reports & dashboard",
      "AI-powered insights",
      "Notifications & alerts",
      "Email support",
    ],
  },
  {
    name: "Starter",
    plan: "starter",
    trial: "7-day free trial",
    cta: "Start Free Trial",
    highlight: false,
    desc: "Perfect for small teams just getting started.",
    features: [
      "Up to 3 professional seats",
      "Online booking page",
      "Client management & CRM",
      "Staff profile & booking links",
      "QR attendance clock-in",
      "Schedule management",
      "Waitlist & queue management",
      "Loyalty program & rewards",
      "Service packages & gift cards",
      "Customer reviews & ratings",
      "Basic reports & dashboard",
      "Notifications & alerts",
      "Customer portal access",
      "Email support",
    ],
  },
  {
    name: "Professional",
    plan: "professional",
    trial: "7-day free trial",
    cta: "Start Free Trial",
    highlight: true,
    desc: "For growing businesses that need more power.",
    features: [
      "Everything in Starter, plus:",
      "Up to 10 professionals",
      "Unlimited bookings",
      "POS & payment processing",
      "Inventory & stock tracking",
      "Consumption tracker",
      "Supplier ledger management",
      "Price lock controls",
      "Reconciliation & finance",
      "SMS & WhatsApp reminders",
      "Promotions & promo codes",
      "Referral program",
      "Haus Connect call centre",
      "AI-powered insights",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    plan: "enterprise",
    trial: "7-day free trial",
    cta: "Contact Sales",
    highlight: false,
    desc: "Multi-location chains and franchise operations.",
    features: [
      "Everything in Professional, plus:",
      "Unlimited professionals",
      "Multi-branch management",
      "Advanced analytics & scorecards",
      "Staff commissions & payroll",
      "Partnership & compliance",
      "Custom branding & white-label",
      "Seat rental management",
      "Client ownership controls",
      "Audit log & security",
      "API access & integrations",
      "Dedicated account manager",
    ],
  },
];

export const PLATFORM_OPTIONS = [
  { id: "barber", label: "Barber", desc: "Barbershops & grooming" },
  { id: "beauty", label: "Beauty", desc: "Salons & stylists" },
  { id: "spa", label: "Spa", desc: "Spa & wellness" },
  { id: "nail_bar", label: "Nails", desc: "Nail bars & studios" },
  { id: "clinic", label: "Clinic", desc: "Aesthetics & med-spa" },
  { id: "mobile", label: "Mobile", desc: "Mobile providers" },
  { id: "therapy", label: "Therapy", desc: "Therapy & counselling" },
  { id: "solo_pro", label: "Solo Pro", desc: "Independent pros" },
  { id: "products", label: "Products", desc: "Retail & product sales" },
] as const;

export type PlatformId = (typeof PLATFORM_OPTIONS)[number]["id"];
