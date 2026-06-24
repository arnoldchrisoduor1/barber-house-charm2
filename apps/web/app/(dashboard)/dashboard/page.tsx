"use client";

import { useEffect } from "react";

import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessCategory } from "@/hooks/useBusinessCategory";

export default function DashboardPage() {
  const { me, isLoading } = useAuth();
  const { terms, label, setFromSubscription } = useBusinessCategory();

  useEffect(() => {
    const businessType = me?.subscription?.businessType ?? me?.activeOrg?.businessType;
    if (businessType) setFromSubscription(businessType);
  }, [me, setFromSubscription]);

  return (
    <AppShell title={terms.servicesPageTitle}>
      <Card className="glass max-w-2xl">
        <CardHeader>
          <CardTitle>{label}</CardTitle>
          <CardDescription>{terms.dashboardSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading workspace...</p>
          ) : me?.user ? (
            <p className="text-muted-foreground">
              Welcome, {me.user.fullName ?? me.user.email}. Dashboard modules will render here.
            </p>
          ) : (
            <p className="text-muted-foreground">Sign in to view your dashboard.</p>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
