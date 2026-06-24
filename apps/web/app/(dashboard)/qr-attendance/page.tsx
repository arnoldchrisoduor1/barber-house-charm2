"use client";

import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function QrAttendancePage() {
  return (
    <ModulePage title="QR Attendance" description="Manager view for staff QR check-in.">
      <Card className="glass max-w-lg">
        <CardHeader>
          <CardTitle>Attendance QR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex aspect-square max-w-xs items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
            <p className="text-sm text-muted-foreground">QR code placeholder</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Display this code at the branch entrance. Staff scan with QR Clock Mode to record
            attendance.
          </p>
        </CardContent>
      </Card>
    </ModulePage>
  );
}
