"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Brain,
  Building2,
  CalendarHeart,
  Car,
  Crown,
  Flower2,
  Gem,
  MonitorSmartphone,
  Scissors,
  Sparkles,
  Stethoscope,
  UserCircle,
} from "lucide-react";

import { useBusinessCategory, type BusinessCategory } from "@/hooks/useAuth";

type PortalType = "staff" | "business" | "client" | "solo";
type StaffSubPortal =
  | "barber"
  | "stylist"
  | "therapist"
  | "nail_tech"
  | "practitioner"
  | "mobile_pro"
  | "receptionist"
  | "branch_manager";
type SoloMode = "barber" | "beauty" | "spa" | "nails" | "clinic" | "therapy";

const portals: {
  type: PortalType;
  icon: typeof Scissors;
  title: string;
  description: string;
}[] = [
  {
    type: "business",
    icon: Building2,
    title: "Business Owner",
    description: "Run your business, team, branches, analytics and growth from one place.",
  },
  {
    type: "staff",
    icon: MonitorSmartphone,
    title: "Staff Portal",
    description: "Choose the exact staff workspace for your role.",
  },
  {
    type: "client",
    icon: CalendarHeart,
    title: "Client Booking",
    description: "Book appointments, manage visits, referrals and loyalty rewards.",
  },
];

const soloModes: {
  type: SoloMode;
  icon: typeof Scissors;
  title: string;
  description: string;
  category: string;
}[] = [
  {
    type: "barber",
    icon: Scissors,
    title: "Solo Barber",
    description: "Independent barbering — cuts, fades, grooming.",
    category: "barber",
  },
  {
    type: "beauty",
    icon: Sparkles,
    title: "Solo Beauty",
    description: "Independent beauty services — makeup, styling, treatments.",
    category: "beauty",
  },
  {
    type: "spa",
    icon: Flower2,
    title: "Solo Spa & Wellness",
    description: "Independent spa therapist — massage, facials, body treatments.",
    category: "spa",
  },
  {
    type: "nails",
    icon: Gem,
    title: "Solo Nails",
    description: "Independent nail tech — manicure, pedicure, nail art.",
    category: "nail_bar",
  },
  {
    type: "clinic",
    icon: Stethoscope,
    title: "Solo Aesthetics",
    description: "Independent aesthetics — skin, injectables, clinical beauty.",
    category: "clinic",
  },
  {
    type: "therapy",
    icon: Brain,
    title: "Solo Therapy",
    description: "Independent therapist — counselling, wellness sessions.",
    category: "therapy",
  },
];

const mobileCategoryCards: {
  icon: typeof Scissors;
  title: string;
  description: string;
  category: string;
}[] = [
  {
    icon: Scissors,
    title: "Mobile Barber",
    description: "Home visit cuts, fades, grooming — on-location barbering.",
    category: "barber",
  },
  {
    icon: Sparkles,
    title: "Mobile Beauty",
    description: "Makeup, styling, beauty treatments at client locations.",
    category: "beauty",
  },
  {
    icon: Flower2,
    title: "Mobile Spa",
    description: "Massage, facials, body treatments — delivered to doorstep.",
    category: "spa",
  },
  {
    icon: Gem,
    title: "Mobile Nails",
    description: "Manicure, pedicure, nail art — home visit nail services.",
    category: "nail_bar",
  },
  {
    icon: Stethoscope,
    title: "Mobile Aesthetics",
    description: "Skin treatments, injectables, clinical beauty on-location.",
    category: "clinic",
  },
  {
    icon: Brain,
    title: "Mobile Therapy",
    description: "Counselling, wellness sessions — in-home therapy visits.",
    category: "therapy",
  },
];

function registerHref(params: {
  portal: string;
  role?: string;
  category?: string;
  specialty?: string;
}) {
  const q = new URLSearchParams();
  q.set("portal", params.portal);
  if (params.role) q.set("role", params.role);
  if (params.category) q.set("category", params.category);
  if (params.specialty) q.set("specialty", params.specialty);
  return `/register?${q.toString()}`;
}

function GetStartedContent() {
  const { label, categories, setCategory } = useBusinessCategory();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") as BusinessCategory | null;
  const specialtyParam = searchParams.get("specialty");

  const hasBarber = categories.includes("barber");
  const hasBeauty = categories.includes("beauty");
  const hasSpa = categories.includes("spa");
  const hasNailBar = categories.includes("nail_bar");
  const hasClinic = categories.includes("clinic");
  const hasMobile = categories.includes("mobile");
  const hasTherapy = categories.includes("therapy");
  const hasSoloPro = categories.includes("solo_pro");

  const isSoloProMode = categoryParam === "solo_pro" || hasSoloPro;
  const isMobileOnly =
    hasMobile && !hasBarber && !hasBeauty && !hasSpa && !hasNailBar && !hasClinic && !hasTherapy;

  const [showStaffSub, setShowStaffSub] = useState(false);
  const [showMobileHub, setShowMobileHub] = useState(false);

  useEffect(() => {
    const validCategories: BusinessCategory[] = [
      "barber",
      "beauty",
      "spa",
      "nail_bar",
      "clinic",
      "mobile",
      "therapy",
      "solo_pro",
      "products",
    ];
    if (categoryParam && validCategories.includes(categoryParam)) {
      setCategory(categoryParam);
    }
  }, [categoryParam, setCategory]);

  const staffSubPortals: {
    type: StaffSubPortal;
    icon: typeof Scissors;
    title: string;
    description: string;
  }[] = [
    ...(hasBarber
      ? [
          {
            type: "barber" as const,
            icon: Scissors,
            title: "Barbers",
            description: "My bookings, schedule, reviews, earnings and client tools.",
          },
        ]
      : []),
    ...(hasBeauty
      ? [
          {
            type: "stylist" as const,
            icon: Sparkles,
            title: "Stylists",
            description: "Appointments, service flow, reviews, earnings and daily client work.",
          },
        ]
      : []),
    ...(hasSpa
      ? [
          {
            type: "therapist" as const,
            icon: Flower2,
            title: "Therapists",
            description: "Treatment bookings, room schedules, client wellness notes and earnings.",
          },
        ]
      : []),
    ...(hasNailBar
      ? [
          {
            type: "nail_tech" as const,
            icon: Gem,
            title: "Nail Techs",
            description: "Nail appointments, station management, product tracking and client preferences.",
          },
        ]
      : []),
    ...(hasClinic
      ? [
          {
            type: "practitioner" as const,
            icon: Stethoscope,
            title: "Practitioners",
            description: "Consultations, treatment plans, patient records and clinical notes.",
          },
        ]
      : []),
    ...(hasMobile
      ? [
          {
            type: "mobile_pro" as const,
            icon: Car,
            title: "Mobile Pros",
            description: "Home visit bookings, route planning, on-site service delivery.",
          },
        ]
      : []),
    ...(hasTherapy
      ? [
          {
            type: "therapist" as const,
            icon: Brain,
            title: "Therapists",
            description: "Session bookings, client progress notes, treatment plans.",
          },
        ]
      : []),
    ...(!isMobileOnly
      ? [
          {
            type: "receptionist" as const,
            icon: CalendarHeart,
            title: "Receptionists",
            description: "Front-desk bookings, queue management, client check-in and POS.",
          },
          {
            type: "branch_manager" as const,
            icon: Crown,
            title: "Branch Managers",
            description: "Branch operations, attendance, reports, reviews and service oversight.",
          },
        ]
      : []),
  ];

  const heroIcon = isSoloProMode
    ? UserCircle
    : hasClinic
      ? Stethoscope
      : hasNailBar
        ? Gem
        : hasMobile
          ? Car
          : hasTherapy
            ? Brain
            : hasSpa && !hasBarber && !hasBeauty
              ? Flower2
              : hasBeauty && !hasBarber
                ? Sparkles
                : Scissors;

  if (isSoloProMode) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-8 sm:py-12">
        <div className="mb-8 text-center sm:mb-10">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 sm:mb-4 sm:h-16 sm:w-16">
            <UserCircle className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
          </div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">
            <span className="text-gradient-gold">Haus of</span>
            <span className="text-foreground"> Solo Pro</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:mt-3 sm:text-lg">
            {specialtyParam ? "Choose how you want to continue" : "Pick your independent practice"}
          </p>
        </div>

        {!specialtyParam ? (
          <div className="grid w-full max-w-4xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {soloModes.map((mode) => (
              <Link
                key={mode.type}
                href={`/get-started?category=solo_pro&specialty=${mode.category}`}
                className="group flex h-full flex-col items-center rounded-xl border border-border bg-card p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-secondary/20 sm:rounded-2xl sm:p-6"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-105 sm:mb-4 sm:h-14 sm:w-14">
                  <mode.icon className="h-5 w-5 text-primary sm:h-7 sm:w-7" />
                </div>
                <h2 className="font-heading text-sm font-bold text-foreground sm:text-lg">{mode.title}</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm">
                  {mode.description}
                </p>
                <span className="mt-2 text-xs font-semibold text-primary sm:mt-4">Continue →</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <Link
              href={registerHref({
                portal: "solo",
                category: "solo_pro",
                specialty: specialtyParam,
              })}
              className="group flex flex-col items-center rounded-xl border border-border bg-card p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-secondary/20 sm:rounded-2xl sm:p-6"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-105 sm:mb-4 sm:h-14 sm:w-14">
                <UserCircle className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
              </div>
              <h2 className="font-heading text-base font-bold text-foreground sm:text-lg">Solo Professional</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm">
                Run your independent practice — bookings, clients, payments, all-in-one.
              </p>
              <span className="mt-3 text-xs font-semibold text-primary sm:mt-4">Sign up →</span>
            </Link>
            <Link
              href={registerHref({
                portal: "client",
                category: "solo_pro",
                specialty: specialtyParam,
              })}
              className="group flex flex-col items-center rounded-xl border border-border bg-card p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-secondary/20 sm:rounded-2xl sm:p-6"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-105 sm:mb-4 sm:h-14 sm:w-14">
                <CalendarHeart className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
              </div>
              <h2 className="font-heading text-base font-bold text-foreground sm:text-lg">Client Booking</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm">
                Book appointments with your favourite solo professional.
              </p>
              <span className="mt-3 text-xs font-semibold text-primary sm:mt-4">Continue →</span>
            </Link>
          </div>
        )}

        <Link href="/" className="mt-6 text-xs text-muted-foreground transition-colors hover:text-primary sm:mt-8">
          ← Back to Home
        </Link>
      </div>
    );
  }

  if (isMobileOnly) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-8 sm:py-12">
        <div className="mb-8 text-center sm:mb-10">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 sm:mb-4 sm:h-16 sm:w-16">
            <Car className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
          </div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">
            <span className="text-gradient-gold">Haus of</span>
            <span className="text-foreground"> Mobile</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:mt-3 sm:text-lg">
            {showMobileHub ? "Choose your mobile service category" : "Select your portal to continue"}
          </p>
        </div>

        {!showMobileHub ? (
          <div className="grid w-full max-w-4xl grid-cols-2 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setShowMobileHub(true)}
              className="group flex flex-col items-center rounded-xl border border-border bg-card p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-secondary/20 sm:rounded-2xl sm:p-6"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-105 sm:mb-4 sm:h-14 sm:w-14">
                <MonitorSmartphone className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
              </div>
              <h2 className="font-heading text-base font-bold text-foreground sm:text-lg">My Mobile Hub</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm">
                Choose your mobile service specialty and manage your business.
              </p>
              <span className="mt-3 text-xs font-semibold text-primary sm:mt-4">Open categories →</span>
            </button>
            <Link
              href={registerHref({ portal: "client", category: categoryParam ?? "mobile" })}
              className="group flex flex-col items-center rounded-xl border border-border bg-card p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-secondary/20 sm:rounded-2xl sm:p-6"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-105 sm:mb-4 sm:h-14 sm:w-14">
                <CalendarHeart className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
              </div>
              <h2 className="font-heading text-base font-bold text-foreground sm:text-lg">Client Booking</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm">
                Book appointments, manage visits, referrals and loyalty rewards.
              </p>
              <span className="mt-3 text-xs font-semibold text-primary sm:mt-4">Continue →</span>
            </Link>
          </div>
        ) : (
          <div className="w-full max-w-4xl space-y-3 sm:space-y-4">
            <button
              type="button"
              onClick={() => setShowMobileHub(false)}
              className="mb-1 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary sm:mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to portals
            </button>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {mobileCategoryCards.map((cat) => (
                <Link
                  key={cat.category}
                  href={registerHref({
                    portal: "staff",
                    role: "mobile_pro",
                    category: "mobile",
                    specialty: cat.category,
                  })}
                  className="group flex h-full flex-col items-center rounded-xl border border-border bg-card p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-secondary/20 sm:rounded-2xl sm:p-6"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-105 sm:mb-4 sm:h-14 sm:w-14">
                    <cat.icon className="h-5 w-5 text-primary sm:h-7 sm:w-7" />
                  </div>
                  <h2 className="font-heading text-sm font-bold text-foreground sm:text-lg">{cat.title}</h2>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm">
                    {cat.description}
                  </p>
                  <span className="mt-2 text-xs font-semibold text-primary sm:mt-4">Sign up →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link href="/" className="mt-6 text-xs text-muted-foreground transition-colors hover:text-primary sm:mt-8">
          ← Back to Home
        </Link>
      </div>
    );
  }

  const HeroIcon = heroIcon;

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-8 sm:py-12">
      <div className="mb-8 text-center sm:mb-10">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 sm:mb-4 sm:h-16 sm:w-16">
          <HeroIcon className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
        </div>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">
          <span className="text-gradient-gold">{label.split(" ").slice(0, 2).join(" ")}</span>
          <span className="text-foreground"> {label.split(" ").slice(2).join(" ")}</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:mt-3 sm:text-lg">
          {showStaffSub ? "Choose the exact staff workspace" : "Select your portal to continue"}
        </p>
      </div>

      {!showStaffSub ? (
        <div className="grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {portals.map((portal) =>
            portal.type === "staff" && !isMobileOnly ? (
              <button
                key={portal.type}
                type="button"
                onClick={() => setShowStaffSub(true)}
                className="group flex flex-col items-center rounded-xl border border-border bg-card p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-secondary/20 sm:rounded-2xl sm:p-6"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-105 sm:mb-4 sm:h-14 sm:w-14">
                  <portal.icon className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
                </div>
                <h2 className="font-heading text-base font-bold text-foreground sm:text-lg">{portal.title}</h2>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm">
                  {portal.description}
                </p>
                <span className="mt-3 text-xs font-semibold text-primary sm:mt-4">Open staff roles →</span>
              </button>
            ) : (
              <Link
                key={portal.type}
                href={
                  portal.type === "staff" && isMobileOnly
                    ? registerHref({
                        portal: "staff",
                        role: "mobile_pro",
                        category: categoryParam ?? undefined,
                      })
                    : registerHref({
                        portal: portal.type,
                        category: categoryParam ?? undefined,
                      })
                }
                className="group flex flex-col items-center rounded-xl border border-border bg-card p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-secondary/20 sm:rounded-2xl sm:p-6"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-105 sm:mb-4 sm:h-14 sm:w-14">
                  <portal.icon className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
                </div>
                <h2 className="font-heading text-base font-bold text-foreground sm:text-lg">{portal.title}</h2>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm">
                  {portal.description}
                </p>
                <span className="mt-3 text-xs font-semibold text-primary sm:mt-4">Continue →</span>
              </Link>
            ),
          )}
        </div>
      ) : (
        <div className="w-full max-w-4xl space-y-3 sm:space-y-4">
          <button
            type="button"
            onClick={() => setShowStaffSub(false)}
            className="mb-1 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary sm:mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to portals
          </button>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {staffSubPortals.map((portal, i) => (
              <Link
                key={`${portal.type}-${i}`}
                href={registerHref({
                  portal: "staff",
                  role: portal.type,
                  category: categoryParam ?? undefined,
                })}
                className="group flex h-full flex-col items-center rounded-xl border border-border bg-card p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-secondary/20 sm:rounded-2xl sm:p-6"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-105 sm:mb-4 sm:h-14 sm:w-14">
                  <portal.icon className="h-5 w-5 text-primary sm:h-7 sm:w-7" />
                </div>
                <h2 className="font-heading text-sm font-bold text-foreground sm:text-lg">{portal.title}</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm">
                  {portal.description}
                </p>
                <span className="mt-2 text-xs font-semibold text-primary sm:mt-4">Sign up →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Link href="/" className="mt-6 text-xs text-muted-foreground transition-colors hover:text-primary sm:mt-8">
        ← Back to Home
      </Link>
    </div>
  );
}

export default function GetStartedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center text-muted-foreground">Loading…</div>
      }
    >
      <GetStartedContent />
    </Suspense>
  );
}
