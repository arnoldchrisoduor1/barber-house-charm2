"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";

import { DataTable } from "@/components/DataTable";
import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";

type WhatsAppLog = Record<string, unknown>;

function pick(row: WhatsAppLog, key: string): unknown {
  if (row[key] !== undefined) return row[key];
  const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  return row[camel];
}

export default function WhatsAppPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;

  const { data, isLoading, error, isError } = useQuery({
    queryKey: ["org", orgId, "whatsapp-logs"],
    enabled: Boolean(orgId),
    retry: false,
    queryFn: async () => {
      const body = await apiClient<{ data: WhatsAppLog[] } | WhatsAppLog[]>(
        `/organizations/${orgId}/whatsapp/logs`,
      );
      return Array.isArray(body) ? body : (body.data ?? []);
    },
  });

  const noBackend = isError && !isLoading;
  const rows = data ?? [];

  const body = (
    <Card className="glass">
      <CardHeader>
        <CardTitle>WhatsApp delivery log</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {error && !noBackend ? (
          <p className="text-destructive">Failed to load delivery log.</p>
        ) : null}
        {noBackend || rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <MessageCircle className="h-7 w-7 text-primary" />
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              {noBackend
                ? "WhatsApp delivery logging is not configured yet. Messages will appear here once the backend endpoint is available."
                : "No WhatsApp messages logged yet."}
            </p>
          </div>
        ) : (
          <DataTable
            columns={[
              {
                key: "recipient",
                header: "Recipient",
                render: (row) => String(pick(row, "recipient") ?? pick(row, "phone") ?? "—"),
              },
              {
                key: "status",
                header: "Status",
                render: (row) => String(pick(row, "status") ?? "—"),
              },
              {
                key: "message",
                header: "Message",
                render: (row) => String(pick(row, "message") ?? pick(row, "body") ?? "—"),
              },
              {
                key: "created_at",
                header: "Sent",
                render: (row) => String(pick(row, "created_at") ?? pick(row, "createdAt") ?? "—"),
              },
            ]}
            rows={rows}
            emptyMessage="No WhatsApp messages logged yet."
            rowKey={(row, i) => String(row.id ?? row.ID ?? i)}
          />
        )}
      </CardContent>
    </Card>
  );

  return (
    <ModulePage title="WhatsApp" feature="sms_reminders">
      <Feature flag="sms_reminders">{body}</Feature>
    </ModulePage>
  );
}
