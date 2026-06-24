"use client";

import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PatientIntakePage() {
  return (
    <ModulePage
      title="Patient Intake"
      description="Clinical intake forms and consent capture for clinic mode."
    >
      <Card className="glass max-w-xl">
        <CardHeader>
          <CardTitle>Intake workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Digital intake, medical history, and consent workflows will be available in clinic mode.
          </p>
        </CardContent>
      </Card>
    </ModulePage>
  );
}
