"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import { useEntityList } from "@/lib/api/crud";

type ChatMessage = Record<string, unknown>;

function pick(row: ChatMessage, key: string): unknown {
  if (row[key] !== undefined) return row[key];
  const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  return row[camel];
}

export default function StaffChatPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const qc = useQueryClient();
  const { data: messages = [], isLoading, error } = useEntityList<ChatMessage>(orgId, "staff-chat");
  const [message, setMessage] = useState("");

  const sendMut = useMutation({
    mutationFn: (body: { message: string; channel: string }) =>
      api.post(`/organizations/${orgId}/staff-chat`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "staff-chat"] });
      setMessage("");
      toast.success("Message sent");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Send failed"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim() || !orgId) return;
    sendMut.mutate({ message: message.trim(), channel: "general" });
  }

  return (
    <ModulePage title="Staff Chat" description="Internal team messaging.">
      <Card className="glass flex max-h-[70vh] flex-col">
        <CardHeader>
          <CardTitle>General channel</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-muted/20 p-4">
            {isLoading && <p className="text-sm text-muted-foreground">Loading messages…</p>}
            {error && <p className="text-sm text-destructive">Failed to load messages.</p>}
            {!isLoading && messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">No messages yet. Say hello!</p>
            ) : null}
            {messages.map((row) => (
              <div
                key={String(row.id ?? row.ID ?? pick(row, "created_at"))}
                className="rounded-lg bg-background/80 px-3 py-2 text-sm shadow-sm"
              >
                <p>{String(pick(row, "message") ?? "")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {String(pick(row, "created_at") ?? pick(row, "createdAt") ?? "")}
                </p>
              </div>
            ))}
          </div>
          <form className="flex gap-2" onSubmit={onSubmit}>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message…"
              rows={2}
              className="min-h-0 flex-1 resize-none"
            />
            <Button type="submit" disabled={!orgId || sendMut.isPending || !message.trim()}>
              Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </ModulePage>
  );
}
