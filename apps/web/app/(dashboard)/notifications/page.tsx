"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { api, apiClient } from "@/lib/api-client";
import { pickRowField } from "@/lib/record-fields";

type InboxItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

type Tab = "all" | "bookings" | "reviews" | "stock";

function mapInbox(row: Record<string, unknown>): InboxItem {
  return {
    id: String(pickRowField(row, "id") ?? ""),
    title: String(pickRowField(row, "title") ?? ""),
    body: String(pickRowField(row, "body") ?? ""),
    type: String(pickRowField(row, "type") ?? "info"),
    isRead: Boolean(pickRowField(row, "read_at") ?? pickRowField(row, "readAt")),
    createdAt: String(pickRowField(row, "created_at") ?? pickRowField(row, "createdAt") ?? ""),
  };
}

function tabFilter(tab: Tab, item: InboxItem): boolean {
  if (tab === "all") return true;
  const hay = `${item.title} ${item.body} ${item.type}`.toLowerCase();
  if (tab === "bookings") return hay.includes("booking") || hay.includes("appointment");
  if (tab === "reviews") return hay.includes("review") || hay.includes("rating");
  if (tab === "stock") return hay.includes("stock") || hay.includes("inventory") || item.type === "alert";
  return true;
}

export default function NotificationsPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");

  const inboxQuery = useQuery({
    queryKey: ["org", orgId, "inbox"],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const res = await apiClient<{ data: Record<string, unknown>[] } | Record<string, unknown>[]>(
        `/organizations/${orgId}/inbox`,
      );
      const rows = Array.isArray(res) ? res : (res.data ?? []);
      return rows.map(mapInbox);
    },
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => api.post(`/organizations/${orgId}/inbox/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", orgId, "inbox"] }),
  });

  const items = useMemo(() => {
    const all = inboxQuery.data ?? [];
    return all.filter((item) => tabFilter(tab, item));
  }, [inboxQuery.data, tab]);

  const unreadCount = (inboxQuery.data ?? []).filter((i) => !i.isRead).length;

  function markAllRead() {
    const unread = (inboxQuery.data ?? []).filter((i) => !i.isRead);
    Promise.all(unread.map((i) => markReadMut.mutateAsync(i.id)))
      .then(() => toast.success("All marked as read"))
      .catch(() => toast.error("Failed to mark all read"));
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "bookings", label: "Bookings" },
    { id: "reviews", label: "Reviews" },
    { id: "stock", label: "Stock" },
  ];

  return (
    <ModulePage title="Notifications" description="Activity inbox and alerts.">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Button
              key={t.id}
              type="button"
              variant={tab === t.id ? "default" : "outline"}
              size="sm"
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        {unreadCount > 0 ? (
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" />
            Mark all read ({unreadCount})
          </Button>
        ) : null}
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Inbox
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inboxQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading notifications…</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No notifications in this tab.</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={`flex gap-4 py-4 ${item.isRead ? "opacity-70" : ""}`}
                  data-testid="inbox-item"
                >
                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.isRead ? "bg-transparent" : "bg-primary"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium">{item.title}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide">
                        {item.type}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.createdAt.slice(0, 16)}</p>
                  </div>
                  {!item.isRead ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => markReadMut.mutate(item.id)}
                    >
                      Mark read
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </ModulePage>
  );
}
