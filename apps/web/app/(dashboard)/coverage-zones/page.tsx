"use client";

import { AnalyticsPage } from "@/components/AnalyticsPage";

export default function CoverageZonesPage() {
  return (
    <AnalyticsPage
      title="Coverage Zones"
      feature="coverage_zones"
      path="analytics/coverage-zones"
      queryKey="coverage-zones"
    />
  );
}
