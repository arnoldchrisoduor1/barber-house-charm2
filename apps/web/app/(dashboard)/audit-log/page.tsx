"use client";

import { useMemo, useState } from "react";

import { DataTable } from "@/components/DataTable";
import { ModulePage } from "@/components/ModulePage";
import { SearchFilter } from "@/components/SearchFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useEntityList } from "@/lib/api/crud";
import { formatDate } from "@/lib/format";
import { pickRowField } from "@/lib/record-fields";
import { cn } from "@/lib/utils";

type AuditRow = Record<string, unknown>;

function actionColor(action: string): string {
  const key = action.toLowerCase();
  if (key.includes("create") || key.includes("insert")) {
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
  }
  if (key.includes("delete") || key.includes("remove")) {
    return "bg-red-500/20 text-red-400 border-red-500/40";
  }
  if (key.includes("update") || key.includes("edit")) {
    return "bg-blue-500/20 text-blue-400 border-blue-500/40";
  }
  return "bg-muted text-muted-foreground border-border";
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        actionColor(action),
      )}
    >
      {action}
    </span>
  );
}

export default function AuditLogPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const [search, setSearch] = useState("");

  const { data: entries = [], isLoading, error } = useEntityList<AuditRow>(orgId, "audit-log");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((row) => {
      const action = String(pickRowField(row, "action") ?? "").toLowerCase();
      const entityType = String(
        pickRowField(row, "entityType") ?? pickRowField(row, "entity_type") ?? "",
      ).toLowerCase();
      return action.includes(q) || entityType.includes(q);
    });
  }, [entries, search]);

  return (
    <ModulePage
      title="Audit Log"
      description="Append-only record of sensitive actions in your organization."
    >
      <Card className="glass">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Recent activity</CardTitle>
          <SearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Filter by action or entity type…"
            className="w-full max-w-xs"
          />
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Loading…</p>}
          {error && <p className="text-destructive">Failed to load audit log.</p>}
          <DataTable
            columns={[
              {
                key: "createdAt",
                header: "When",
                render: (row) => {
                  const raw = String(
                    pickRowField(row, "createdAt") ?? pickRowField(row, "created_at") ?? "",
                  );
                  return raw ? formatDate(raw) : "—";
                },
              },
              {
                key: "action",
                header: "Action",
                render: (row) => (
                  <ActionBadge action={String(pickRowField(row, "action") ?? "unknown")} />
                ),
              },
              {
                key: "entityType",
                header: "Entity",
                render: (row) =>
                  String(
                    pickRowField(row, "entityType") ?? pickRowField(row, "entity_type") ?? "—",
                  ),
              },
            ]}
            rows={filtered}
            emptyMessage="No audit entries yet."
            rowKey={(row) => String(row.id ?? row.ID ?? "")}
          />
        </CardContent>
      </Card>
    </ModulePage>
  );
}
