"use client";

import { BookingWizard } from "@/components/booking/BookingWizard";

interface PublicBookPageProps {
  params: { orgSlug: string };
}

export default function PublicBookPage({ params }: PublicBookPageProps) {
  return (
    <div className="relative min-h-screen p-6">
      <div className="mesh-aurora" aria-hidden />
      <div className="relative z-10 mx-auto max-w-3xl pt-10">
        <BookingWizard mode="public" orgSlug={params.orgSlug} />
      </div>
    </div>
  );
}
