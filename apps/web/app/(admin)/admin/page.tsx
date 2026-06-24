"use client";

import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboardPage() {
  return (
    <AppShell title="Platform Admin">
      <Card className="glass max-w-2xl">
        <CardHeader>
          <CardTitle>Admin Console</CardTitle>
          <CardDescription>Cross-tenant platform management stub</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Tenant provisioning, feature flags, and payout oversight will live here.</p>
          <p>Routes are scoped to `/api/v1/platform/*` with platform role enforcement.</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
