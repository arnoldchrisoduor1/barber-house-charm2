"use client";

import { AnalyticsPage } from "@/components/AnalyticsPage";

export default function SessionNotesPage() {
  return (
    <AnalyticsPage
      title="Session Notes"
      feature="therapy_notes"
      path="analytics/session-notes"
      queryKey="session-notes"
    />
  );
}
