"use client";

import { AnalyticsPage } from "@/components/AnalyticsPage";

export default function Page() {
  return (
    <AnalyticsPage
      title="Reports"
      feature="basic_reports"
      path="analytics/reports"
      queryKey="analytics-reports"
    />
  );
}
