"use client";

import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SessionNotesPage() {
  return (
    <ModulePage
      title="Session Notes"
      description="Structured session documentation for therapy mode."
    >
      <Card className="glass max-w-xl">
        <CardHeader>
          <CardTitle>Clinical notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            SOAP-style session notes, treatment plans, and practitioner sign-off will live here.
          </p>
        </CardContent>
      </Card>
    </ModulePage>
  );
}
