"use client";

import { AppShell } from "@/components/AppShell";
import { Feature } from "@/components/Feature";
import { PosWorkspace } from "@/components/pos/PosWorkspace";

export default function POSPage() {
  return (
    <AppShell title="POS">
      <Feature flag="pos_payments" fallback={<p>Upgrade to Professional for POS.</p>}>
        <PosWorkspace />
      </Feature>
    </AppShell>
  );
}
