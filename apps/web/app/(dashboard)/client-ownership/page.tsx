"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { DataTable } from "@/components/DataTable";
import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { SearchFilter } from "@/components/SearchFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessCategory } from "@/hooks/useBusinessCategory";
import { useEntityList } from "@/lib/api/crud";
import { api } from "@/lib/api-client";
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
  const { terms } = useBusinessCategory();
  const orgId = activeOrg?.id;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferRow, setTransferRow] = useState<OwnershipRow | null>(null);
  const [targetStaffId, setTargetStaffId] = useState("");
  const [reason, setReason] = useState("");

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

  const transferMut = useMutation({
    mutationFn: async () => {
      if (!orgId || !transferRow) return;
      const customerId = String(transferRow.id ?? transferRow.ID ?? "");
      return api.patch(`/organizations/${orgId}/customers/${customerId}/ownership`, {
        assigned_staff_id: targetStaffId || null,
        reason,
      });
    },
    onSuccess: () => {
      toast.success("Ownership updated");
      qc.invalidateQueries({ queryKey: ["org", orgId, "customers/ownership"] });
      setTransferOpen(false);
      setTransferRow(null);
      setReason("");
      setTargetStaffId("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Transfer failed"),
  });

  function openTransfer(row: OwnershipRow) {
    setTransferRow(row);
    setTargetStaffId(String(pickRowField(row, "assigned_staff_id") ?? ""));
    setReason("");
    setTransferOpen(true);
  }

  const body = (
    <Card className="glass">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Client ownership</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <SearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Search clients or staff…"
            className="w-full sm:max-w-xs"
          />
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-full min-w-0 sm:w-[140px]">
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
            {
              key: "actions",
              header: "",
              render: (row) => (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="ownership-transfer-btn"
                  onClick={() => openTransfer(row)}
                >
                  Transfer
                </Button>
              ),
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
      <Feature flag="crm">
        {body}
        <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
          <DialogContent data-testid="ownership-transfer-dialog">
            <DialogHeader>
              <DialogTitle>Transfer client ownership</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Assign to {terms.staffSingular.toLowerCase()}</Label>
                <Select value={targetStaffId || "__none"} onValueChange={(v) => setTargetStaffId(v === "__none" ? "" : v)}>
                  <SelectTrigger data-testid="ownership-staff-select">
                    <SelectValue placeholder={`Select ${terms.staffSingular.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Unassigned</SelectItem>
                    {staff.map((row) => {
                      const id = String(row.id ?? row.ID ?? "");
                      return (
                        <SelectItem key={id} value={id}>
                          {String(pickRowField(row, "display_name") ?? "Staff")}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ownership-reason">Reason (required)</Label>
                <Textarea
                  id="ownership-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  data-testid="ownership-reason"
                />
              </div>
              <Button
                className="w-full"
                disabled={!reason.trim() || transferMut.isPending}
                onClick={() => transferMut.mutate()}
              >
                {transferMut.isPending ? "Saving…" : "Confirm transfer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Feature>
    </ModulePage>
  );
}
