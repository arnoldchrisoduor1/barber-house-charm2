"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Google Maps loads lazily — set NEXT_PUBLIC_GOOGLE_MAPS_KEY in env for production. */
export default function CoverageMap() {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Service areas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-96 rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground">
          Map placeholder — wire Google Maps JS API with org zones from API
        </div>
      </CardContent>
    </Card>
  );
}
