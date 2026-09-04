"use client";

import { Building2 } from "lucide-react";
import { useMemo, useState } from "react";
import { modeTerms, type BusinessMode } from "@haus/contracts";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";

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

export function HausSwitcher() {
  const { me, selectOrg } = useAuth();
  const [switching, setSwitching] = useState(false);

  const orgs = useMemo(() => {
    const rows = me?.organizations ?? [];
    return [...rows].sort((a, b) => {
      const ai = MODE_ORDER.indexOf((a.businessType ?? "") as BusinessMode);
      const bi = MODE_ORDER.indexOf((b.businessType ?? "") as BusinessMode);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
  }, [me?.organizations]);

  const activeId = me?.activeOrg?.id;
  if (orgs.length <= 1) return null;

  async function onSelect(orgId: string) {
    if (!orgId || orgId === activeId || switching) return;
    setSwitching(true);
    try {
      await selectOrg(orgId);
      window.location.assign("/dashboard");
    } catch {
      setSwitching(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial" data-testid="haus-switcher">
      <Building2 className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden />
      <Select value={activeId} onValueChange={(value) => void onSelect(value)} disabled={switching}>
        <SelectTrigger
          className="h-11 w-full min-w-0 text-sm md:h-9 md:w-[180px] lg:w-[220px]"
          aria-label="Switch Haus"
        >
          <SelectValue placeholder={switching ? "Switching…" : "Choose Haus"} />
        </SelectTrigger>
        <SelectContent>
          {orgs.filter((org) => org.id).map((org) => (
            <SelectItem key={org.id} value={org.id!}>
              {hausLabel(org.businessType, org.name ?? "Haus")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
