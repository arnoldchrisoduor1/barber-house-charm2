"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Feature } from "@/components/Feature";

type QueueEvent = { type: string; bookingId?: string; status?: string };

export default function QueuePage() {
  const { activeOrg } = useAuth();
  const [events, setEvents] = useState<QueueEvent[]>([]);

  useEffect(() => {
    if (!activeOrg?.id) return;
    const wsUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname}:8080/api/v1/realtime/ws?org=${activeOrg.id}`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (ev) => {
      try {
        setEvents((prev) => [JSON.parse(ev.data), ...prev].slice(0, 20));
      } catch {
        /* ignore */
      }
    };
    return () => ws.close();
  }, [activeOrg?.id]);

  return (
    <AppShell title="Walk-in queue">
      <Feature flag="queue">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Live queue board</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-muted-foreground">Waiting for walk-ins…</p>
            ) : (
              <ul className="space-y-2">
                {events.map((e, i) => (
                  <li key={i} className="stat-tile p-3 text-sm">
                    {e.type} — {e.status ?? "update"}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </Feature>
    </AppShell>
  );
}
