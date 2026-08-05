"use client";

import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBusinessCategory } from "@/hooks/useBusinessCategory";
import { SPA_AFTERCARE_TEMPLATES } from "@/lib/api/spa";

export default function AftercarePage() {
  const { mode } = useBusinessCategory();
  const isSpa = mode === "spa";

  return (
    <Feature flag="clinical">
      <ModulePage
        title="Aftercare"
        description={
          isSpa
            ? "Post-treatment and pre-visit guidance for spa guests."
            : "Aftercare templates and clinical follow-up guidance."
        }
      >
        <div data-testid="aftercare-page" className="grid gap-4 sm:grid-cols-2">
          {(isSpa ? SPA_AFTERCARE_TEMPLATES : SPA_AFTERCARE_TEMPLATES.slice(0, 2)).map((t) => (
            <Card key={t.title} className="glass">
              <CardHeader>
                <CardTitle className="text-base">{t.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{t.body}</CardContent>
            </Card>
          ))}
        </div>
      </ModulePage>
    </Feature>
  );
}
