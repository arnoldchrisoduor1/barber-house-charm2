"use client";

import { useQuery } from "@tanstack/react-query";

import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Feature } from "@/components/Feature";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";

interface AnalyticsPageProps {
  title: string;
  feature?: string;
  path: string;
  queryKey: string;
}

export function AnalyticsPage({ title, feature, path, queryKey }: AnalyticsPageProps) {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ["org", orgId, queryKey],
    enabled: Boolean(orgId),
    queryFn: () => apiClient<Record<string, unknown>>(`/organizations/${orgId}/${path}`),
  });

  const body = (
    <Card className="glass">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {error && <p className="text-destructive">Failed to load analytics.</p>}
        {data ? (
          <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted/40 p-4 text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : null}
      </CardContent>
    </Card>
  );

  return (
    <ModulePage title={title} feature={feature}>
      {feature ? <Feature flag={feature}>{body}</Feature> : body}
    </ModulePage>
  );
}
