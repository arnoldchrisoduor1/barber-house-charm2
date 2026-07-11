"use client";

import { modeTerms } from "@haus/contracts";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import {
  Brain,
  Car,
  Flower2,
  Gem,
  Scissors,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  UserCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth, type BusinessCategory } from "@/hooks/useAuth";
import { useBusinessCategory } from "@/hooks/useBusinessCategory";
import { ApiError } from "@/lib/api-client";

const HOUSES: {
  key: BusinessCategory;
  Icon: typeof Scissors;
}[] = [
  { key: "barber", Icon: Scissors },
  { key: "beauty", Icon: Sparkles },
  { key: "spa", Icon: Flower2 },
  { key: "nail_bar", Icon: Gem },
  { key: "clinic", Icon: Stethoscope },
  { key: "mobile", Icon: Car },
  { key: "therapy", Icon: Brain },
  { key: "solo_pro", Icon: UserCircle },
  { key: "products", Icon: ShoppingBag },
];

const STAFF_ROLE_MAP: Record<string, string> = {
  barber: "senior_barber",
  stylist: "senior_barber",
  therapist: "senior_barber",
  nail_tech: "senior_barber",
  practitioner: "senior_barber",
  mobile_pro: "senior_barber",
  receptionist: "receptionist",
  branch_manager: "branch_manager",
};

function resolveRegisterRole(portal: string | null, role: string | null): string {
  if (portal === "business" || portal === "solo") return "ceo";
  if (portal === "client") return "customer";
  if (role && STAFF_ROLE_MAP[role]) return STAFF_ROLE_MAP[role];
  return "ceo";
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();
  const { setCategory } = useBusinessCategory();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const categoryParam = (searchParams.get("category") as BusinessCategory | null) ?? "barber";
  const specialtyParam = searchParams.get("specialty");
  const portalParam = searchParams.get("portal");
  const roleParam = searchParams.get("role");
  const isClientPortal = portalParam === "client";
  const isStaffPortal = portalParam === "staff";

  const businessType = useMemo(() => {
    if (categoryParam === "solo_pro" && specialtyParam) return specialtyParam;
    return categoryParam;
  }, [categoryParam, specialtyParam]);

  const registerRole = resolveRegisterRole(portalParam, roleParam);
  const houseLabel =
    modeTerms.brandLabels[businessType as keyof typeof modeTerms.brandLabels] ??
    modeTerms.brandLabels.barber;

  useEffect(() => {
    if (!isClientPortal) setCategory(categoryParam);
  }, [categoryParam, setCategory, isClientPortal]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const resp = await register({
        email: String(form.get("email")),
        password: String(form.get("password")),
        fullName: String(form.get("fullName")),
        organizationName: isClientPortal ? undefined : String(form.get("organizationName")),
        businessType: isClientPortal ? undefined : businessType,
        role: registerRole,
        accountType: isClientPortal ? "client" : "business",
      });
      if (resp.requiresVerification) {
        setVerificationSent(true);
        setVerifiedEmail(resp.email ?? String(form.get("email")));
        return;
      }
      router.push(isClientPortal ? "/home" : "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (isStaffPortal) {
    return (
      <div className="relative flex min-h-screen items-center justify-center p-6">
        <div className="mesh-ambient" aria-hidden />
        <Card className="relative z-10 w-full max-w-lg glass">
          <CardHeader>
            <CardTitle>Staff accounts are invite-only</CardTitle>
            <CardDescription>
              Your business owner must invite you by email. Check your inbox for an invite link, or ask them to send
              one from the Staff page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full bg-gradient-gold text-primary-foreground">
              <Link href="/login">Sign in with invite</Link>
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/get-started" className="text-primary hover:underline">
                ← Back to get started
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationSent) {
    return (
      <div className="relative flex min-h-screen items-center justify-center p-6">
        <div className="mesh-ambient" aria-hidden />
        <Card className="relative z-10 w-full max-w-lg glass" data-testid="register-verification-sent">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a verification link to <strong>{verifiedEmail}</strong>. Open it to activate your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Go to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-6">
      <div className="mesh-ambient" aria-hidden />
      <Card className="relative z-10 w-full max-w-lg glass">
        <CardHeader>
          <CardTitle>
            {isClientPortal ? "Create your client account" : `Create your ${houseLabel} account`}
          </CardTitle>
          <CardDescription>
            Portal: {portalParam ?? "business"} · Role: {registerRole.replace(/_/g, " ")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isClientPortal ? (
            <div className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {HOUSES.map(({ key, Icon }) => (
                <Link
                  key={key}
                  href={`/register?category=${key}${portalParam ? `&portal=${portalParam}` : ""}${roleParam ? `&role=${roleParam}` : ""}`}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center text-[10px] transition-colors ${
                    businessType === key || categoryParam === key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="line-clamp-2">{modeTerms.brandLabels[key]}</span>
                </Link>
              ))}
            </div>
          ) : null}
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <fieldset className="space-y-4" disabled={!mounted || loading}>
              <label className="block space-y-1">
                <span className="text-sm text-muted-foreground">Full name</span>
                <input
                  name="fullName"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              {!isClientPortal ? (
                <label className="block space-y-1">
                  <span className="text-sm text-muted-foreground">Organization name</span>
                  <input
                    name="organizationName"
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
              ) : null}
              <label className="block space-y-1">
                <span className="text-sm text-muted-foreground">Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-muted-foreground">Password</span>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full bg-gradient-gold text-primary-foreground">
                {loading ? "Creating..." : "Create account"}
              </Button>
            </fieldset>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {!isClientPortal ? (
              <>
                <Link href="/get-started" className="text-primary hover:underline">
                  ← Choose a different Haus
                </Link>
                {" · "}
              </>
            ) : null}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
