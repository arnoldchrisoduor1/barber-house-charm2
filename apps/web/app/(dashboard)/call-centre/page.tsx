"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, MessageSquare, Phone } from "lucide-react";

import { DialPad } from "@/components/DialPad";
import { ModulePage } from "@/components/ModulePage";
import { StatTile } from "@/components/dashboard/StatTile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";

interface CallCentreStats {
  total_enquiries: number;
  unread_enquiries: number;
  total_bookings: number;
  pending_bookings: number;
}

export default function CallCentrePage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["org", orgId, "analytics-call-centre"],
    enabled: !!orgId,
    queryFn: () => api.get<CallCentreStats>(`/organizations/${orgId}/analytics/call-centre`),
  });

  return (
    <ModulePage title="Call Centre" feature="advanced_analytics" description="Inbound enquiries and outbound calling.">
      {error ? <p className="text-destructive">Failed to load call centre stats.</p> : null}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="call-centre-stats">
        <StatTile icon={MessageSquare} label="Total enquiries" value={data ? String(data.total_enquiries) : "—"} loading={isLoading} />
        <StatTile icon={Phone} label="Unread" value={data ? String(data.unread_enquiries) : "—"} loading={isLoading} />
        <StatTile icon={CalendarCheck} label="Bookings" value={data ? String(data.total_bookings) : "—"} loading={isLoading} />
        <StatTile icon={CalendarCheck} label="Pending" value={data ? String(data.pending_bookings) : "—"} loading={isLoading} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <DialPad />
        <Card className="glass">
          <CardHeader>
            <CardTitle>Call centre tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Use speed dial for frequent contacts and branch managers.</p>
            <p>Unread enquiries should be cleared within 15 minutes during business hours.</p>
            <p>Transfer calls to reception when booking walk-ins during peak hours.</p>
          </CardContent>
        </Card>
      </div>
    </ModulePage>
  );
}
