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
  secondary_color?: string;
  accent_color?: string;
  logo_url?: string;
  tagline?: string;
  business_name?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  businessName?: string;
};

function pickBranding(data: Branding) {
  return {
    primaryColor: data.primary_color ?? data.primaryColor ?? "#D4A853",
    secondaryColor: data.secondary_color ?? data.secondaryColor ?? "#1A1A2E",
    accentColor: data.accent_color ?? data.accentColor ?? "#E8C547",
    logoUrl: data.logo_url ?? data.logoUrl ?? "",
    tagline: data.tagline ?? "",
    businessName: data.business_name ?? data.businessName ?? "",
  };
}

export default function BrandingPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const qc = useQueryClient();
  const [primaryColor, setPrimaryColor] = useState("#D4A853");
  const [secondaryColor, setSecondaryColor] = useState("#1A1A2E");
  const [accentColor, setAccentColor] = useState("#E8C547");
  const [logoUrl, setLogoUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [businessName, setBusinessName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["org", orgId, "branding"],
    enabled: Boolean(orgId),
    queryFn: () => apiClient<Branding>(`/organizations/${orgId}/branding`),
  });

  useEffect(() => {
    if (!data) return;
    const b = pickBranding(data);
    setPrimaryColor(b.primaryColor);
    setSecondaryColor(b.secondaryColor);
    setAccentColor(b.accentColor);
    setLogoUrl(b.logoUrl);
    setTagline(b.tagline);
    setBusinessName(b.businessName || activeOrg?.name || "");
  }, [data, activeOrg?.name]);

  const saveMut = useMutation({
    mutationFn: () =>
      apiClient(`/organizations/${orgId}/branding`, {
        method: "PUT",
        body: JSON.stringify({
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
          logo_url: logoUrl,
          tagline,
          business_name: businessName,
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
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="glass">
        <CardHeader>
          <CardTitle>Organization branding</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="business_name">Business name</Label>
              <Input
                id="business_name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
            {[
              { id: "primary_color", label: "Primary", value: primaryColor, set: setPrimaryColor },
              { id: "secondary_color", label: "Secondary", value: secondaryColor, set: setSecondaryColor },
              { id: "accent_color", label: "Accent", value: accentColor, set: setAccentColor },
            ].map((field) => (
              <div key={field.id} className="space-y-1.5">
                <Label htmlFor={field.id}>{field.label} color</Label>
                <div className="flex gap-2">
                  <Input
                    id={field.id}
                    type="color"
                    value={field.value}
                    onChange={(e) => field.set(e.target.value)}
                    className="h-10 w-14 cursor-pointer p-1"
                  />
                  <Input value={field.value} onChange={(e) => field.set(e.target.value)} />
                </div>
              </div>
            ))}
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
            <Button type="submit" disabled={!orgId || saveMut.isPending}>
              Save branding
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="glass overflow-hidden" data-testid="branding-preview">
        <CardHeader>
          <CardTitle>Live preview</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div
            className="p-6"
            style={{ backgroundColor: secondaryColor, color: "#fff" }}
          >
            <div className="flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-10 w-10 rounded object-contain" />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {businessName.charAt(0) || "H"}
                </div>
              )}
              <div>
                <p className="font-heading text-lg font-semibold">{businessName || "Your business"}</p>
                {tagline ? <p className="text-sm opacity-80">{tagline}</p> : null}
              </div>
            </div>
          </div>
          <div className="space-y-3 p-6" style={{ backgroundColor: `${primaryColor}15` }}>
            <Button style={{ backgroundColor: primaryColor, color: secondaryColor }}>
              Book appointment
            </Button>
            <div className="flex gap-2">
              <span
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: accentColor, color: secondaryColor }}
              >
                Accent badge
              </span>
              <span
                className="rounded-full px-3 py-1 text-xs"
                style={{ border: `1px solid ${primaryColor}`, color: primaryColor }}
              >
                Outline
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <ModulePage title="Branding" feature="custom_branding">
      <Feature flag="custom_branding">{body}</Feature>
    </ModulePage>
  );
}
