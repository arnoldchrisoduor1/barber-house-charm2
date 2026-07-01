"use client";

import { AnalyticsPage } from "@/components/AnalyticsPage";

export default function Page() {
  return (
    <AnalyticsPage
      title="Scorecards"
      feature="advanced_analytics"
      path="analytics/scorecards"
      queryKey="analytics-scorecards"
    />
  );
}
