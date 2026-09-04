"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { pickRowField } from "@/lib/record-fields";
import { cn } from "@/lib/utils";

export type SelectedCustomer = {
  id: string;
  name: string;
  phone: string;
};

type Props = {
  orgId: string;
  value: SelectedCustomer | null;
  onChange: (customer: SelectedCustomer | null) => void;
  label?: string;
  testId?: string;
  enabled?: boolean;
};

export function CustomerPicker({
  orgId,
  value,
  onChange,
  label = "Client",
  testId = "customer-picker",
  enabled = true,
}: Props) {
  const [search, setSearch] = useState("");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["org", orgId, "customers", "picker"],
    enabled: !!orgId && enabled,
    queryFn: async () => {
      const resp = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/customers`);
      return resp.data ?? [];
    },
  });

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? customers.filter((row) => {
          const name = String(pickRowField(row, "full_name") ?? pickRowField(row, "fullName") ?? "").toLowerCase();
          const phone = String(pickRowField(row, "phone") ?? "").toLowerCase();
          return name.includes(q) || phone.includes(q);
        })
      : customers;
    return list.slice(0, 8);
  }, [customers, search]);

  return (
    <div className="space-y-2" data-testid={testId}>
      <Label>{label}</Label>
      {value ? (
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="font-medium">{value.name}</p>
            {value.phone ? <p className="text-xs text-muted-foreground">{value.phone}</p> : null}
          </div>
          <button
            type="button"
            className="inline-flex min-h-11 shrink-0 items-center px-2 text-sm text-primary hover:underline"
            onClick={() => {
              onChange(null);
              setSearch("");
            }}
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or phone"
              className="pl-9"
              data-testid={`${testId}-search`}
            />
          </div>
          {isLoading ? <p className="text-xs text-muted-foreground">Loading clients…</p> : null}
          {!isLoading && matches.length === 0 ? (
            <p className="text-xs text-muted-foreground">No clients match.</p>
          ) : (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border/50 p-1">
              {matches.map((row) => {
                const id = String(row.id ?? row.ID ?? "");
                const name = String(pickRowField(row, "full_name") ?? pickRowField(row, "fullName") ?? "Client");
                const phone = String(pickRowField(row, "phone") ?? "");
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={cn(
                        "w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted/60 min-h-11",
                      )}
                      onClick={() => {
                        onChange({ id, name, phone });
                        setSearch("");
                      }}
                    >
                      <span className="font-medium">{name}</span>
                      {phone ? <span className="ml-2 text-xs text-muted-foreground">{phone}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
