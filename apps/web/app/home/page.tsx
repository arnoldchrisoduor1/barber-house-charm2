"use client";

import { modeTerms, type BusinessMode } from "@haus/contracts";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import { pickRowField } from "@/lib/record-fields";

const HAUS_MODES: BusinessMode[] = [
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

type PublicOrg = Record<string, unknown>;

export default function ClientHomePage() {
  const [category, setCategory] = useState<BusinessMode>("barber");
  const { selectOrg, refreshMe } = useAuth();
  const router = useRouter();
  const [selecting, setSelecting] = useState<string | null>(null);

  const orgsQuery = useQuery({
    queryKey: ["public-orgs", category],
    queryFn: () => api.get<{ data: PublicOrg[] }>(`/public/orgs?category=${category}`),
  });

  const orgs = useMemo(() => orgsQuery.data?.data ?? [], [orgsQuery.data]);

  async function chooseOrg(row: PublicOrg) {
    const orgId = String(pickRowField(row, "id") ?? pickRowField(row, "ID") ?? "");
    if (!orgId) return;
    setSelecting(orgId);
    try {
      await selectOrg(orgId);
      await refreshMe();
      router.push("/portal/book");
    } finally {
      setSelecting(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/40 px-6 py-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-semibold">Find your Haus</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a Haus category, then pick a business to book appointments and manage your visits.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex flex-wrap gap-2" data-testid="haus-filter">
          {HAUS_MODES.map((mode) => (
            <Button
              key={mode}
              type="button"
              variant={category === mode ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(mode)}
              data-testid={`haus-filter-${mode}`}
            >
              {modeTerms.brandLabels[mode]}
            </Button>
          ))}
        </div>

        {orgsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading businesses…</p>
        ) : orgs.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No businesses registered under this Haus yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="org-grid">
            {orgs.map((row) => {
              const id = String(pickRowField(row, "id") ?? pickRowField(row, "ID") ?? "");
              const name = String(pickRowField(row, "name") ?? "Business");
              const slug = String(pickRowField(row, "slug") ?? "");
              const branches = Number(pickRowField(row, "branch_count") ?? 0);
              return (
                <Card key={id} className="glass transition hover:border-primary/40" data-testid={`org-card-${slug}`}>
                  <CardHeader>
                    <CardTitle className="text-lg">{name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {branches} branch{branches === 1 ? "" : "es"}
                    </p>
                    <Button
                      className="w-full bg-gradient-gold text-primary-foreground"
                      disabled={selecting === id}
                      onClick={() => void chooseOrg(row)}
                    >
                      {selecting === id ? "Opening…" : "Book here"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
