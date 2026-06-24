"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DataTable } from "@/components/DataTable";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";

type Branch = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
};

export default function BranchesPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["org", orgId, "branches"],
    enabled: !!orgId,
    queryFn: () => apiClient<Branch[]>(`/organizations/${orgId}/branches`),
  });

  const createBranch = useMutation({
    mutationFn: (payload: { name: string; address: string; phone: string }) =>
      apiClient(`/organizations/${orgId}/branches`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "branches"] });
      setName("");
      setAddress("");
      setPhone("");
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    createBranch.mutate({ name: name.trim(), address: address.trim(), phone: phone.trim() });
  }

  const rows = (Array.isArray(data) ? data : []).map((branch) => ({
    ...branch,
    isActive: branch.isActive ?? true,
  }));

  return (
    <ModulePage
      title="Branches"
      feature="multi_branch"
      description="Manage locations and branch contact details."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Branches</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-muted-foreground">Loading…</p>}
            {error && <p className="text-destructive">Failed to load branches.</p>}
            <DataTable
              columns={[
                { key: "name", header: "Name" },
                { key: "address", header: "Address" },
                { key: "phone", header: "Phone" },
                {
                  key: "isActive",
                  header: "Active",
                  render: (row) => (row.isActive ? "Yes" : "No"),
                },
              ]}
              rows={rows}
              emptyMessage="No branches yet."
            />
          </CardContent>
        </Card>

        <Card className="glass h-fit">
          <CardHeader>
            <CardTitle>Add branch</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onSubmit}>
              <label className="block space-y-1">
                <span className="text-sm text-muted-foreground">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-muted-foreground">Address</span>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-muted-foreground">Phone</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <Button type="submit" disabled={!orgId || createBranch.isPending} className="w-full">
                {createBranch.isPending ? "Creating…" : "Create branch"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModulePage>
  );
}
