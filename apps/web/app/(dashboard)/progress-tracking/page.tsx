"use client";

import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProgressTrackingPage() {
  return (
    <ModulePage
      title="Progress Tracking"
      description="Client outcome metrics and goal tracking for therapy mode."
    >
      <Card className="glass max-w-xl">
        <CardHeader>
          <CardTitle>Progress dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Longitudinal outcome charts, goal milestones, and session-over-session comparisons will
            appear here.
          </p>
        </CardContent>
      </Card>
    </ModulePage>
  );
}
