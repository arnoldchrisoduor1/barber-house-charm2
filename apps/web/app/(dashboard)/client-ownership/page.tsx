"use client";

import { useMemo, useState } from "react";

import { DataTable } from "@/components/DataTable";
import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { SearchFilter } from "@/components/SearchFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useEntityList } from "@/lib/api/crud";
import { pickRowField } from "@/lib/record-fields";
import { cn } from "@/lib/utils";

type OwnershipRow = Record<string, unknown>;
type StaffRow = Record<string, unknown>;

const TIER_COLORS: Record<string, string> = {
  bronze: "bg-amber-900/30 text-amber-500 border-amber-700/50",
  silver: "bg-slate-500/20 text-slate-300 border-slate-500/50",
  gold: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  platinum: "bg-violet-500/20 text-violet-300 border-violet-500/50",
};

export default function ClientOwnershipPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");

  const { data: ownership = [], isLoading, error } = useEntityList<OwnershipRow>(
    orgId,
    "customers/ownership",
  );
  const { data: staff = [] } = useEntityList<StaffRow>(orgId, "staff");

  const staffNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of staff) {
      map.set(String(row.id ?? row.ID ?? ""), String(pickRowField(row, "display_name") ?? "Staff"));
    }
    return map;
  }, [staff]);

  const tiers = useMemo(() => {
    const set = new Set<string>();
    for (const row of ownership) {
      const tier = String(pickRowField(row, "loyalty_tier") ?? "").trim();
      if (tier) set.add(tier.toLowerCase());
    }
    return Array.from(set).sort();
  }, [ownership]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ownership.filter((row) => {
      const tier = String(pickRowField(row, "loyalty_tier") ?? "").toLowerCase();
      if (tierFilter !== "all" && tier !== tierFilter) return false;
      if (!q) return true;
      const name = String(pickRowField(row, "full_name") ?? "").toLowerCase();
      const phone = String(pickRowField(row, "phone") ?? "").toLowerCase();
      const staffName =
        staffNameById.get(String(pickRowField(row, "assigned_staff_id") ?? ""))?.toLowerCase() ?? "";
      return name.includes(q) || phone.includes(q) || staffName.includes(q);
    });
  }, [ownership, search, tierFilter, staffNameById]);

  const body = (
    <Card className="glass">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Client ownership</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <SearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Search clients or staff…"
            className="w-full max-w-xs"
          />
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              {tiers.map((tier) => (
                <SelectItem key={tier} value={tier}>
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {error && <p className="text-destructive">Failed to load ownership data.</p>}
        <DataTable
          columns={[
            {
              key: "full_name",
              header: "Client",
              render: (row) => String(pickRowField(row, "full_name") ?? "—"),
            },
            {
              key: "phone",
              header: "Phone",
              render: (row) => String(pickRowField(row, "phone") ?? "—"),
            },
            {
              key: "assigned_staff_id",
              header: "Assigned staff",
              render: (row) => {
                const id = String(pickRowField(row, "assigned_staff_id") ?? "");
                return id ? (staffNameById.get(id) ?? "Unknown") : "Unassigned";
              },
            },
            {
              key: "loyalty_tier",
              header: "Tier",
              render: (row) => {
                const tier = String(pickRowField(row, "loyalty_tier") ?? "—");
                if (tier === "—") return tier;
                return (
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                      TIER_COLORS[tier.toLowerCase()] ?? "bg-muted text-muted-foreground border-border",
                    )}
                  >
                    {tier}
                  </span>
                );
              },
            },
          ]}
          rows={filtered}
          emptyMessage="No client ownership records yet."
          rowKey={(row) => String(row.id ?? row.ID ?? "")}
        />
      </CardContent>
    </Card>
  );

  return (
    <ModulePage title="Client Ownership" feature="crm">
      <Feature flag="crm">{body}</Feature>
    </ModulePage>
  );
}
