"use client";

import { AppShell } from "@/components/AppShell";
import { Feature } from "@/components/Feature";
import { PosWorkspace } from "@/components/pos/PosWorkspace";
import { useBusinessCategory } from "@/hooks/useBusinessCategory";

export default function POSPage() {
  const { mode } = useBusinessCategory();
  const title = mode === "therapy" ? "Session Billing" : "POS";
  return (
    <AppShell title={title}>
      <Feature flag="pos_payments" fallback={<p>Upgrade to Professional for POS.</p>}>
        <PosWorkspace />
      </Feature>
    </AppShell>
  );
}
