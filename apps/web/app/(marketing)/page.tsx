import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MarketingHomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="mesh-aurora" aria-hidden />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-16">
        <header className="flex items-center justify-between">
          <div>
            <p className="label-eyebrow">Haus of Wellness</p>
            <h1 className="font-display text-4xl text-gradient-aurora sm:text-5xl">
              One platform. Nine business modes.
            </h1>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="bg-gradient-gold text-primary-foreground shadow-gold">
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </header>

        <main className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "Barber & Beauty",
              description: "Appointments, POS, staff scheduling, and client CRM in one shell.",
            },
            {
              title: "Spa & Wellness",
              description: "Treatment rooms, guest journeys, and luxury theming out of the box.",
            },
            {
              title: "Retail & Products",
              description: "Inventory, bundles, and storefront flows for product-led businesses.",
            },
          ].map((item) => (
            <Card key={item.title} className="glass stat-tile border-border/60">
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="link" className="px-0">
                  <Link href="/register">Start free trial</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </main>
      </div>
    </div>
  );
}
