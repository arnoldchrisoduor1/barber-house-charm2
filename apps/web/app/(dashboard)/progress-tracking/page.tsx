"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useEntityList } from "@/lib/api/crud";
import { fetchSessionNotes } from "@/lib/api/spa";
import { pickRowField } from "@/lib/record-fields";

type CustomerRow = Record<string, unknown>;

export default function ProgressTrackingPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";

  const { data: customers = [] } = useEntityList<CustomerRow>(orgId, "customers");
  const notesQuery = useQuery({
    queryKey: ["org", orgId, "session-notes", "progress"],
    queryFn: () => fetchSessionNotes(orgId),
    enabled: !!orgId,
  });

  const customerName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of customers) {
      map.set(String(c.id ?? c.ID ?? ""), String(pickRowField(c, "full_name") ?? "Guest"));
    }
    return map;
  }, [customers]);

  const byGuest = useMemo(() => {
    const map = new Map<string, NonNullable<typeof notesQuery.data>[number][]>();
    for (const n of notesQuery.data ?? []) {
      if (!map.has(n.customer_id)) map.set(n.customer_id, []);
      map.get(n.customer_id)!.push(n);
    }
    return map;
  }, [notesQuery.data]);

  return (
    <Feature flag="therapy_notes">
      <ModulePage title="Progress Tracking" description="Guest wellness journey from session notes.">
        <div data-testid="progress-tracking-page" className="space-y-4">
          {notesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading progress…</p>
          ) : byGuest.size === 0 ? (
            <p className="text-sm text-muted-foreground">No session history yet. Add notes on Session Notes.</p>
          ) : (
            Array.from(byGuest.entries()).map(([guestId, notes]) => {
              const sorted = [...notes].sort((a, b) => b.session_date.localeCompare(a.session_date));
              const latest = sorted[0];
              return (
                <Card key={guestId} className="glass">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{customerName.get(guestId) ?? "Guest"}</CardTitle>
                    <p className="text-xs text-muted-foreground">{sorted.length} session{sorted.length === 1 ? "" : "s"} recorded</p>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p className="text-muted-foreground">
                      Latest ({latest.session_date}): {latest.title || latest.content?.slice(0, 120) || "—"}
                    </p>
                    {latest.next_visit_notes ? (
                      <p><span className="text-foreground">Recommended next:</span> {latest.next_visit_notes}</p>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ModulePage>
    </Feature>
  );
}
