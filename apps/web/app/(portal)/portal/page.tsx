"use client";

import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { Feature } from "@/components/Feature";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBusinessCategory } from "@/hooks/useBusinessCategory";

export default function PortalHomePage() {
  const { terms, label } = useBusinessCategory();

  return (
    <AppShell title="Customer Portal">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <CardTitle>{label}</CardTitle>
            <CardDescription>{terms.bookingVerb}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Book {terms.bookingPlural.toLowerCase()}, manage your profile, and view history.
            </p>
            <Button asChild className="bg-gradient-gold text-primary-foreground">
              <Link href="/login">Sign in to portal</Link>
            </Button>
          </CardContent>
        </Card>

        <Feature flag="loyalty" fallback={null}>
          <Card className="glass">
            <CardHeader>
              <CardTitle>Loyalty</CardTitle>
              <CardDescription>Rewards and points</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Your loyalty balance will appear here.</p>
            </CardContent>
          </Card>
        </Feature>
      </div>
    </AppShell>
  );
}
