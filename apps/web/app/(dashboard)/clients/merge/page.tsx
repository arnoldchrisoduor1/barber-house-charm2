"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Merge } from "lucide-react";
import { toast } from "sonner";

import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { fetchCustomers, mergeCustomers } from "@/lib/api/crm-advanced";

export default function ClientMergePage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const customersQuery = useQuery({
    queryKey: ["org", orgId, "customers-merge"],
    queryFn: () => fetchCustomers(orgId),
    enabled: !!orgId,
  });

  const mergeMut = useMutation({
    mutationFn: () => mergeCustomers(orgId, primaryId!, selected.filter((id) => id !== primaryId)),
    onSuccess: () => {
      setPrimaryId(null);
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "customers-merge"] });
      toast.success("Clients merged — history kept on primary");
    },
    onError: (e: Error) => toast.error(e.message || "Merge failed"),
  });

  const filtered = useMemo(() => {
    const rows = customersQuery.data ?? [];
    const needle = q.toLowerCase();
    return rows.filter(
      (c) =>
        !c.mergedIntoId &&
        (c.fullName.toLowerCase().includes(needle) || (c.phone ?? "").includes(q)),
    );
  }, [customersQuery.data, q]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <Feature flag="crm">
      <ModulePage
        title="Client Merge"
        description="Combine duplicate profiles. Bookings and spend roll up to the primary client."
      >
        <div data-testid="client-merge-page">

      <Card className="glass mb-4">
        <CardContent className="pt-6">
          <Input placeholder="Search by name or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {filtered.map((c) => (
          <Card
            key={c.id}
            className={`glass cursor-pointer p-4 transition ${selected.includes(c.id) ? "ring-2 ring-primary" : ""}`}
            onClick={() => toggle(c.id)}
            data-testid="client-merge-row"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{c.fullName}</p>
                <p className="text-sm text-muted-foreground">{c.phone || "No phone"}</p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>{c.totalVisits} visits</p>
                <p>KES {c.totalSpent.toLocaleString()}</p>
              </div>
            </div>
            {primaryId === c.id ? (
              <p className="mt-2 text-xs font-medium text-primary">Primary record</p>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setPrimaryId(c.id);
                }}
              >
                Set as primary
              </Button>
            )}
          </Card>
        ))}
      </div>

      <Button
        className="mt-6 gap-2"
        disabled={!primaryId || selected.filter((id) => id !== primaryId).length === 0 || mergeMut.isPending}
        onClick={() => mergeMut.mutate()}
        data-testid="client-merge-submit"
      >
        <Merge className="h-4 w-4" />
        Merge selected into primary
      </Button>
        </div>
      </ModulePage>
    </Feature>
  );
}
