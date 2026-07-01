"use client";

import { AnalyticsPage } from "@/components/AnalyticsPage";

export default function ProgressTrackingPage() {
  return (
    <AnalyticsPage
      title="Progress Tracking"
      feature="therapy_notes"
      path="analytics/progress-tracking"
      queryKey="progress-tracking"
    />
  );
}
