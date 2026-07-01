"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";

type Branding = {
  primary_color?: string;
  logo_url?: string;
  tagline?: string;
  primaryColor?: string;
  logoUrl?: string;
};

function pickBranding(data: Branding) {
  return {
    primaryColor: data.primary_color ?? data.primaryColor ?? "#D4A853",
    logoUrl: data.logo_url ?? data.logoUrl ?? "",
    tagline: data.tagline ?? "",
  };
}

export default function BrandingPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const qc = useQueryClient();
  const [primaryColor, setPrimaryColor] = useState("#D4A853");
  const [logoUrl, setLogoUrl] = useState("");
  const [tagline, setTagline] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["org", orgId, "branding"],
    enabled: Boolean(orgId),
    queryFn: () => apiClient<Branding>(`/organizations/${orgId}/branding`),
  });

  useEffect(() => {
    if (!data) return;
    const b = pickBranding(data);
    setPrimaryColor(b.primaryColor);
    setLogoUrl(b.logoUrl);
    setTagline(b.tagline);
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () =>
      apiClient(`/organizations/${orgId}/branding`, {
        method: "PUT",
        body: JSON.stringify({
          primary_color: primaryColor,
          logo_url: logoUrl,
          tagline,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "branding"] });
      toast.success("Branding saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    saveMut.mutate();
  }

  const body = (
    <Card className="glass max-w-lg">
      <CardHeader>
        <CardTitle>Organization branding</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="primary_color">Primary color</Label>
            <div className="flex gap-2">
              <Input
                id="primary_color"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-14 cursor-pointer p-1"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#D4A853"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input
              id="logo_url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Your tagline"
            />
          </div>
          {logoUrl ? (
            <div className="rounded-lg border border-border p-4 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="Logo preview" className="mx-auto max-h-16 object-contain" />
            </div>
          ) : null}
          <Button type="submit" disabled={!orgId || saveMut.isPending}>
            Save branding
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  return (
    <ModulePage title="Branding" feature="custom_branding">
      <Feature flag="custom_branding">{body}</Feature>
    </ModulePage>
  );
}
