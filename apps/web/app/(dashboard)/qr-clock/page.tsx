"use client";

import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function QrClockPage() {
  return (
    <ModulePage title="QR Clock" description="Staff self-service clock in and out.">
      <Card className="glass max-w-md">
        <CardHeader>
          <CardTitle>Clock mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Scan the branch QR code to record your shift. Camera access and scan validation will be
            enabled in a later release.
          </p>
          <Button className="w-full" disabled>
            Open scanner (coming soon)
          </Button>
        </CardContent>
      </Card>
    </ModulePage>
  );
}
