"use client";

import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AftercarePage() {
  return (
    <ModulePage
      title="Aftercare"
      description="Post-treatment instructions and follow-up schedules."
    >
      <Card className="glass max-w-xl">
        <CardHeader>
          <CardTitle>Aftercare plans</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Template aftercare instructions and automated follow-up reminders for clinic and spa
            modes.
          </p>
        </CardContent>
      </Card>
    </ModulePage>
  );
}
