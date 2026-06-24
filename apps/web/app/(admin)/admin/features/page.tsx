"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type FeatureRow = { key: string; label: string; globalEnabled: boolean; minPlan: string };

export default function AdminFeaturesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["platform", "features"],
    queryFn: () => apiClient<{ data: FeatureRow[] }>("/platform/features"),
  });

  const toggle = useMutation({
    mutationFn: (feature: FeatureRow) =>
      apiClient("/platform/features/" + feature.key, {
        method: "PATCH",
        body: { globalEnabled: !feature.globalEnabled },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform", "features"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Feature management</h1>
        <p className="text-sm text-muted-foreground">Global kill-switch and registry controls.</p>
      </div>
      <Card className="glass">
        <CardHeader>
          <CardTitle>Registry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data?.data ?? []).map((f) => (
            <div key={f.key} className="flex items-center justify-between stat-tile p-3">
              <div>
                <p className="font-medium">{f.label}</p>
                <p className="text-xs text-muted-foreground">
                  {f.key} · min {f.minPlan} ·{" "}
                  {f.globalEnabled ? "globally enabled" : "kill-switched off"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggle.mutate(f)}
                disabled={toggle.isPending}
              >
                {f.globalEnabled ? "Disable globally" : "Enable globally"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
