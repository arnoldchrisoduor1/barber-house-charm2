"use client";

import { AppShell } from "@/components/AppShell";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { useAuth } from "@/hooks/useAuth";

export default function PortalBookPage() {
  const { activeOrg } = useAuth();

  return (
    <AppShell title="Book appointment">
      <BookingWizard mode="portal" orgId={activeOrg?.id} title="Book your next visit" />
    </AppShell>
  );
}
