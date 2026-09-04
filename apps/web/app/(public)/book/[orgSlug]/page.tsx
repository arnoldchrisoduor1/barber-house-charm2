"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { modeTerms } from "@haus/contracts";

import { BookingWizard } from "@/components/booking/BookingWizard";
import { fetchPublicOrg } from "@/lib/api/booking";

interface PublicBookPageProps {
  params: { orgSlug: string };
}

export default function PublicBookPage({ params }: PublicBookPageProps) {
  const orgQuery = useQuery({
    queryKey: ["public-org", params.orgSlug],
    queryFn: () => fetchPublicOrg(params.orgSlug),
  });

  const businessType = orgQuery.data?.businessType ?? "barber";
  const specialty = orgQuery.data?.specialty;
  const termsKey =
    businessType === "mobile" && specialty && modeTerms.modes[specialty as keyof typeof modeTerms.modes]
      ? specialty
      : businessType;
  const terms = modeTerms.modes[termsKey as keyof typeof modeTerms.modes] ?? modeTerms.modes.barber;
  const brand =
    modeTerms.brandLabels[businessType as keyof typeof modeTerms.brandLabels] ?? orgQuery.data?.name ?? "Book online";
  const themeClass =
    modeTerms.themeClasses[businessType as keyof typeof modeTerms.themeClasses] ?? undefined;

  useEffect(() => {
    if (!themeClass) return;
    document.documentElement.classList.add(themeClass);
    return () => {
      document.documentElement.classList.remove(themeClass);
    };
  }, [themeClass]);

  return (
    <div className="relative min-h-dvh p-4 md:p-6" data-testid="public-book-page">
      <div className="mesh-aurora" aria-hidden />
      <div className="relative z-10 mx-auto max-w-3xl pt-10">
        <header className="mb-8 text-center">
          <p className="label-eyebrow mb-2">{brand}</p>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{terms.bookingVerb}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Select services, pick a time, and choose your {terms.staffSingular.toLowerCase()}.
          </p>
        </header>
        <BookingWizard
          mode="public"
          orgSlug={params.orgSlug}
          bookingVerb={terms.bookingVerb}
          staffSingular={terms.staffSingular}
          homeVisit={businessType === "mobile"}
        />
      </div>
    </div>
  );
}
