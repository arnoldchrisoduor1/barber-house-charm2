"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Hash, Megaphone, MessageSquare, HelpCircle } from "lucide-react";
import { toast } from "sonner";

import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import { pickRowField } from "@/lib/record-fields";
import { cn } from "@/lib/utils";

type ChatMessage = Record<string, unknown>;

const CHANNELS = [
  { id: "general", label: "General", icon: MessageSquare },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "schedule", label: "Schedule", icon: Hash },
  { id: "help", label: "Help", icon: HelpCircle },
] as const;

function pick(row: ChatMessage, key: string): unknown {
  if (row[key] !== undefined) return row[key];
  const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  return row[camel];
}

export default function StaffChatPage() {
  const { activeOrg, me } = useAuth();
  const orgId = activeOrg?.id;
  const qc = useQueryClient();
  const [channel, setChannel] = useState<string>("general");
  const [message, setMessage] = useState("");

  const messagesQuery = useQuery({
    queryKey: ["org", orgId, "staff-chat", channel],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const res = await api.get<{ data: ChatMessage[] }>(`/organizations/${orgId}/staff-chat`, {
        params: { channel },
      });
      return res.data ?? [];
    },
  });

  const sendMut = useMutation({
    mutationFn: (body: { message: string; channel: string }) =>
      api.post(`/organizations/${orgId}/staff-chat`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "staff-chat", channel] });
      setMessage("");
      toast.success("Message sent");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Send failed"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim() || !orgId) return;
    sendMut.mutate({ message: message.trim(), channel });
  }

  const messages = messagesQuery.data ?? [];

  return (
    <ModulePage title="Staff Chat" description="Internal team messaging.">
      <div className="flex min-h-[70vh] gap-4">
        <aside className="hidden w-48 shrink-0 flex-col gap-1 sm:flex">
          {CHANNELS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setChannel(id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
                channel === id
                  ? "bg-primary/15 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
              data-testid={`chat-channel-${id}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </aside>

        <Card className="glass flex min-h-0 flex-1 flex-col">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="capitalize">{channel} channel</CardTitle>
              <select
                className="rounded-md border border-border bg-background px-2 py-1 text-sm sm:hidden"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                {CHANNELS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-muted/20 p-4">
              {messagesQuery.isLoading && (
                <p className="text-sm text-muted-foreground">Loading messages…</p>
              )}
              {messagesQuery.error && (
                <p className="text-sm text-destructive">Failed to load messages.</p>
              )}
              {!messagesQuery.isLoading && messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">No messages yet. Say hello!</p>
              ) : null}
              {messages.map((row) => {
                const senderId = String(pick(row, "sender_id") ?? pick(row, "senderId") ?? "");
                const isMine = senderId === me?.user?.id;
                return (
                  <div
                    key={String(row.id ?? row.ID ?? pick(row, "created_at"))}
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm",
                      isMine ? "ml-auto bg-primary/15" : "bg-background/80",
                    )}
                  >
                    <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {isMine ? "You" : senderId.slice(0, 8) + "…"}
                    </p>
                    <p>{String(pick(row, "message") ?? "")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {String(pick(row, "created_at") ?? pick(row, "createdAt") ?? "")}
                    </p>
                  </div>
                );
              })}
            </div>
            <form className="flex gap-2" onSubmit={onSubmit}>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Message #${channel}…`}
                rows={2}
                className="min-h-0 flex-1 resize-none"
              />
              <Button type="submit" disabled={!orgId || sendMut.isPending || !message.trim()}>
                Send
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModulePage>
  );
}
