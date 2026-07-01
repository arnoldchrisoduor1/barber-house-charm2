"use client";

import { AnalyticsPage } from "@/components/AnalyticsPage";

export default function Page() {
  return (
    <AnalyticsPage
      title="Revenue Forecast"
      feature="advanced_analytics"
      path="analytics/revenue-forecast"
      queryKey="analytics-revenue-forecast"
    />
  );
}
