"use client";

import { modeTerms, type BusinessMode } from "@haus/contracts";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { getDefaultRoute } from "@/lib/role-redirect";

const MODE_ORDER: BusinessMode[] = [
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

function hausLabel(businessType: string | undefined, fallback: string): string {
  if (!businessType) return fallback;
  return (modeTerms.brandLabels as Record<string, string>)[businessType] ?? fallback;
}

export default function SelectHausPage() {
  const { me, isAuthenticated, isLoading, selectOrg } = useAuth();
  const router = useRouter();
  const [selecting, setSelecting] = useState<string | null>(null);

  const orgs = useMemo(() => {
    const rows = me?.organizations ?? [];
    return [...rows].sort((a, b) => {
      const ai = MODE_ORDER.indexOf((a.businessType ?? "") as BusinessMode);
      const bi = MODE_ORDER.indexOf((b.businessType ?? "") as BusinessMode);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
  }, [me?.organizations]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (orgs.length <= 1) {
      router.replace(getDefaultRoute(me?.roles ?? []));
    }
  }, [isLoading, isAuthenticated, orgs.length, me?.roles, router]);

  async function choose(orgId: string) {
    setSelecting(orgId);
    try {
      await selectOrg(orgId);
      window.location.assign("/dashboard");
    } finally {
      setSelecting(null);
    }
  }

  if (isLoading || !isAuthenticated || orgs.length <= 1) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading Hauses…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen p-6">
      <div className="mesh-ambient" aria-hidden />
      <div className="relative z-10 mx-auto max-w-5xl py-10">
        <p className="label-eyebrow">Haus of Wellness</p>
        <h1 className="mt-2 font-display text-4xl text-gradient-gold">Choose a Haus</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          You belong to more than one workspace. Pick which Haus to open — you can switch anytime from the header.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="haus-picker-grid">
          {orgs.map((org) => {
            const id = org.id ?? "";
            const active = id === me?.activeOrg?.id;
            return (
              <Card key={id} className="glass" data-testid={`haus-card-${org.slug ?? id}`}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {hausLabel(org.businessType, org.name ?? "Haus")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{org.name}</p>
                  <Button
                    className="w-full bg-gradient-gold text-primary-foreground"
                    disabled={selecting === id}
                    onClick={() => void choose(id)}
                  >
                    {selecting === id ? "Opening…" : active ? "Continue here" : "Open this Haus"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
