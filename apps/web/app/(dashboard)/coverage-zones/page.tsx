"use client";

import dynamic from "next/dynamic";
import { AppShell } from "@/components/AppShell";
import { Feature } from "@/components/Feature";

const CoverageMap = dynamic(() => import("@/components/CoverageMap"), { ssr: false });

export default function CoverageZonesPage() {
  return (
    <AppShell title="Coverage zones">
      <Feature flag="coverage_zones">
        <CoverageMap />
      </Feature>
    </AppShell>
  );
}
