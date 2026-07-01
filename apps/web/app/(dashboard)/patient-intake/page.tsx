"use client";

import { AnalyticsPage } from "@/components/AnalyticsPage";

export default function PatientIntakePage() {
  return (
    <AnalyticsPage
      title="Patient Intake"
      feature="clinical"
      path="analytics/patient-intake"
      queryKey="patient-intake"
    />
  );
}
