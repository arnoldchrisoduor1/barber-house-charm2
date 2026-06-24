"use client";

import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FieldOperationsPage() {
  return (
    <ModulePage
      title="Field Operations"
      description="Dispatch, routes, and on-site workflows for mobile and multi-location modes."
    >
      <Card className="glass max-w-xl">
        <CardHeader>
          <CardTitle>Field ops hub</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Mode-specific field operations — dispatch boards, route planning, and technician status —
            will render here based on your business category.
          </p>
        </CardContent>
      </Card>
    </ModulePage>
  );
}
