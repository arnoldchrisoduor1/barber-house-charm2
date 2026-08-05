"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Calendar, CheckCircle2, Clock, MapPin, Scissors, User, AlertTriangle, Armchair } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  addMinutesToTime,
  fetchOrgCatalog,
  fetchPublicCatalog,
  fetchStaffAvailability,
  formatKes,
  submitPortalBooking,
  submitPublicBooking,
  type BookingCatalog,
  type PortalBookingPayload,
} from "@/lib/api/booking";
import { useAuth } from "@/hooks/useAuth";
import { readPortalCustomerPhone, usePortalCustomerStore } from "@/lib/store/portal-customer-store";
import { fetchPatchTests } from "@/lib/api/beauty-crm";
import { fetchResources } from "@/lib/api/spa";
import { useFeature } from "@/hooks/useFeature";

const BASE_STEPS = ["branch", "services", "datetime", "staff", "resource", "confirm"] as const;
type Step = (typeof BASE_STEPS)[number];

interface BookingWizardProps {
  mode: "public" | "portal" | "staff";
  orgSlug?: string;
  orgId?: string;
  title?: string;
  bookingVerb?: string;
  staffSingular?: string;
  customerName?: string;
  customerPhone?: string;
  customerId?: string;
  customerHasAllergies?: boolean;
  customerAllergyNotes?: string;
  onStaffBooked?: () => void;
}

export function BookingWizard({
  mode,
  orgSlug,
  orgId,
  title,
  bookingVerb = "Book an appointment",
  staffSingular = "professional",
  customerName: presetCustomerName,
  customerPhone: presetCustomerPhone,
  customerId,
  customerHasAllergies = false,
  customerAllergyNotes = "",
  onStaffBooked,
}: BookingWizardProps) {
  const { me } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [branchId, setBranchId] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [bookingDate, setBookingDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [staffId, setStaffId] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const catalogQuery = useQuery({
    queryKey: ["booking-catalog", mode, orgSlug, orgId, branchId],
    queryFn: async (): Promise<BookingCatalog> => {
      if (mode === "public" && orgSlug) {
        return fetchPublicCatalog(orgSlug, branchId || undefined);
      }
      if ((mode === "portal" || mode === "staff") && orgId) {
        return fetchOrgCatalog(orgId, branchId || undefined);
      }
      return { branches: [], services: [], staff: [] };
    },
    enabled: (mode === "public" && !!orgSlug) || ((mode === "portal" || mode === "staff") && !!orgId),
  });

  useEffect(() => {
    if (mode === "portal") {
      const storePhone = usePortalCustomerStore.getState().phone ?? readPortalCustomerPhone();
      const storeName = usePortalCustomerStore.getState().fullName;
      const authName = me?.user?.fullName ?? "";
      if (storePhone) setPhone(storePhone);
      if (storeName || authName) setFullName(storeName || authName);
    }
    if (mode === "staff") {
      if (presetCustomerPhone) setPhone(presetCustomerPhone);
      if (presetCustomerName) setFullName(presetCustomerName);
    }
  }, [mode, me?.user?.fullName, presetCustomerName, presetCustomerPhone]);

  const catalog = catalogQuery.data ?? { branches: [], services: [], staff: [] };

  useEffect(() => {
    if (!branchId && catalog.branches.length === 1) {
      setBranchId(catalog.branches[0].id);
    }
  }, [branchId, catalog.branches]);
  const selectedServices = catalog.services.filter((s) => serviceIds.includes(s.id));
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.priceKes, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0) || 30;
  const endTime = bookingDate && startTime ? addMinutesToTime(startTime, totalDuration) : "";

  const staffPool = useMemo(() => {
    if (!branchId) return catalog.staff;
    return catalog.staff.filter((s) => !s.branchId || s.branchId === branchId);
  }, [catalog.staff, branchId]);

  const resourceBooking = useFeature("resource_booking") && mode !== "public";

  const steps = useMemo(() => {
    let list: Step[] = [...BASE_STEPS];
    if (catalog.branches.length <= 1) {
      list = list.filter((s) => s !== "branch");
    }
    if (!resourceBooking) {
      list = list.filter((s) => s !== "resource");
    }
    return list;
  }, [catalog.branches.length, resourceBooking]);

  const currentStep = steps[stepIndex] as Step;
  const staffStepIndex = steps.indexOf("staff");

  const availabilityQuery = useQuery({
    queryKey: ["staff-availability", mode, orgSlug, orgId, bookingDate, startTime, totalDuration, branchId, staffPool.map((s) => s.id).join(",")],
    enabled: !!bookingDate && !!startTime && staffPool.length > 0 && stepIndex >= staffStepIndex,
    queryFn: async () => {
      const path =
        mode === "public" && orgSlug
          ? `/organizations/public/${orgSlug}/staff-availability`
          : `/organizations/${orgId}/bookings/staff-availability`;
      return fetchStaffAvailability(path, {
        bookingDate,
        startTime,
        durationMinutes: totalDuration,
        branchId: branchId || undefined,
        staffIds: staffPool.map((s) => s.id),
      });
    },
  });

  const availableStaff = staffPool.filter((s) => availabilityQuery.data?.[s.id] !== false);

  const sortedStaff = useMemo(() => {
    const categories = selectedServices.map((s) => s.category.toLowerCase()).filter(Boolean);
    if (categories.length === 0) return availableStaff;
    return [...availableStaff].sort((a, b) => {
      const score = (member: (typeof availableStaff)[number]) => {
        const specs = (member.specialties ?? []).map((x) => x.toLowerCase());
        return categories.some((c) => specs.includes(c)) ? 1 : 0;
      };
      return score(b) - score(a);
    });
  }, [availableStaff, selectedServices]);

  const needsPatchTest = selectedServices.some((s) => s.requiresPatchTest);
  const patchTestsQuery = useQuery({
    queryKey: ["patch-tests-booking", orgId, customerId],
    queryFn: () => fetchPatchTests(orgId!, customerId!),
    enabled: !!orgId && !!customerId && needsPatchTest,
  });
  const hasValidPatchTest = useMemo(() => {
    const rows = patchTestsQuery.data ?? [];
    const now = Date.now();
    return rows.some((t) => {
      if (t.result !== "pass") return false;
      if (!t.expires_at) return true;
      return new Date(t.expires_at).getTime() >= now;
    });
  }, [patchTestsQuery.data]);
  const patchTestWarning = needsPatchTest && customerId && !patchTestsQuery.isLoading && !hasValidPatchTest;

  const needsCouplesCapacity = selectedServices.some((s) => s.category.toLowerCase() === "couples_package");
  const minResourceCapacity = needsCouplesCapacity ? 2 : 1;

  const resourceStepIndex = steps.indexOf("resource");
  const resourcesQuery = useQuery({
    queryKey: ["booking-resources", orgId, branchId],
    queryFn: () => fetchResources(orgId!, branchId || undefined),
    enabled: !!orgId && resourceBooking && resourceStepIndex >= 0 && stepIndex >= resourceStepIndex,
  });

  const availableResources = (resourcesQuery.data ?? []).filter(
    (r) => r.status === "available" && r.capacity >= minResourceCapacity,
  );

  const displayTitle = title ?? bookingVerb;

  const submitMutation = useMutation({
    mutationFn: async (payload: PortalBookingPayload) => {
      if (mode === "public" && orgSlug) {
        return submitPublicBooking(orgSlug, payload);
      }
      if (mode === "portal" && orgId) {
        return submitPortalBooking(orgId, payload);
      }
      if (mode === "staff" && orgId) {
        return submitPortalBooking(orgId, payload);
      }
      throw new Error("Missing organization context");
    },
    onSuccess: (_data, payload) => {
      if (mode !== "staff") {
        usePortalCustomerStore.getState().setContact(payload.phone, payload.fullName);
      }
      setBooked(true);
      setError(null);
      onStaffBooked?.();
    },
    onError: (err: Error) => setError(err.message),
  });

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setStaffId("");
  }

  function canProceed(): boolean {
    switch (currentStep) {
      case "branch":
        return !!branchId || catalog.branches.length === 0;
      case "services":
        return serviceIds.length > 0;
      case "datetime":
        return !!bookingDate && !!startTime;
      case "staff":
        return !!staffId && availabilityQuery.data?.[staffId] !== false;
      case "resource":
        return !!resourceId;
      case "confirm":
        return mode === "staff" ? !!staffId : !!fullName && !!phone;
      default:
        return false;
    }
  }

  function next() {
    if (!canProceed()) return;
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
      setError(null);
    }
  }

  function back() {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
      setError(null);
    }
  }

  function handleSubmit() {
    if (!canProceed() || !staffId) return;
    const payload: PortalBookingPayload = {
      branchId: branchId || catalog.branches[0]?.id,
      staffId,
      resourceId: resourceId || undefined,
      serviceIds,
      bookingDate,
      startTime,
      fullName,
      phone,
      notes,
    };
    submitMutation.mutate(payload);
  }

  if (booked) {
    return (
      <Card className="glass mx-auto max-w-lg">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <CheckCircle2 className="h-14 w-14 text-primary" />
          <h2 className="font-heading text-2xl font-semibold">Booking confirmed</h2>
          <p className="text-sm text-muted-foreground">
            {bookingDate} at {startTime} · {formatKes(totalPrice)}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6" data-testid="booking-wizard" data-prefill-name={fullName} data-prefill-phone={phone}>
      <div>
        <h1 className="font-heading text-2xl font-semibold">{displayTitle}</h1>
        <p className="text-sm text-muted-foreground">
          Step {stepIndex + 1} of {steps.length}: {stepLabel(currentStep, staffSingular)}
        </p>
      </div>

      <div className="flex gap-2">
        {steps.map((step, i) => (
          <div
            key={step}
            className={cn(
              "h-1 flex-1 rounded-full",
              i <= stepIndex ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {stepIcon(currentStep)}
            {stepLabel(currentStep, staffSingular)}
          </CardTitle>
          <CardDescription>{stepDescription(currentStep, staffSingular)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentStep === "branch" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {catalog.branches.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => {
                    setBranchId(branch.id);
                    setStaffId("");
                  }}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors",
                    branchId === branch.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <p className="font-medium">{branch.name}</p>
                  {branch.address ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {branch.address}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}

          {currentStep === "services" ? (
            <div className="grid gap-3">
              {catalog.services.map((service) => {
                const selected = serviceIds.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-4 text-left transition-colors",
                      selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                    )}
                  >
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {service.category} · {service.durationMinutes} min
                      </p>
                    </div>
                    <span className="font-mono-ui text-sm">{formatKes(service.priceKes)}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {currentStep === "datetime" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="booking-date">Date</Label>
                <Input
                  id="booking-date"
                  type="date"
                  value={bookingDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => {
                    setBookingDate(e.target.value);
                    setStaffId("");
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-time">Time</Label>
                <Input
                  id="booking-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setStaffId("");
                  }}
                />
              </div>
              {bookingDate && startTime ? (
                <p className="sm:col-span-2 text-sm text-muted-foreground">
                  Estimated end: {endTime} ({totalDuration} minutes)
                </p>
              ) : null}
            </div>
          ) : null}

          {currentStep === "staff" ? (
            <div className="space-y-3">
              {availabilityQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Checking availability…</p>
              ) : availableStaff.length === 0 ? (
                <p className="text-sm text-destructive">
                  No professionals are available at this time. Try another slot.
                </p>
              ) : (
                sortedStaff.map((member) => {
                  const categories = selectedServices.map((s) => s.category.toLowerCase());
                  const matched = (member.specialties ?? []).some((sp) =>
                    categories.includes(sp.toLowerCase()),
                  );
                  return (
                  <button
                    key={member.id}
                    type="button"
                    data-testid={`booking-staff-${member.id}`}
                    onClick={() => setStaffId(member.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                      staffId === member.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <User className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {member.displayName}
                        {matched ? (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-primary" data-testid="staff-specialty-match">
                            Specialty match
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.title ?? member.role}</p>
                      {member.bio ? <p className="mt-1 text-xs text-muted-foreground">{member.bio}</p> : null}
                    </div>
                  </button>
                  );
                })
              )}
            </div>
          ) : null}

          {currentStep === "resource" ? (
            <div className="space-y-3">
              {resourcesQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading treatment rooms…</p>
              ) : availableResources.length === 0 ? (
                <p className="text-sm text-destructive">
                  No available rooms meet capacity ({minResourceCapacity}+). Try another time or room.
                </p>
              ) : (
                availableResources.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    data-testid={`booking-resource-${room.id}`}
                    onClick={() => setResourceId(room.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                      resourceId === room.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <Armchair className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{room.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {room.resource_type.replace(/_/g, " ")} · capacity {room.capacity}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : null}

          {currentStep === "confirm" ? (
            <div className="space-y-4">
              {customerHasAllergies ? (
                <div
                  className="flex gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200"
                  data-testid="booking-allergy-warning"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Allergy alert</p>
                    <p className="text-red-200/90">{customerAllergyNotes || "Client has known allergies on file."}</p>
                  </div>
                </div>
              ) : null}
              {patchTestWarning ? (
                <div
                  className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200"
                  data-testid="booking-patch-test-warning"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <p>No valid patch test on file for selected chemical service. Proceed only after patch test recorded.</p>
                </div>
              ) : null}
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-2">
                <p>
                  <span className="text-muted-foreground">Services:</span>{" "}
                  {selectedServices.map((s) => s.name).join(", ")}
                </p>
                <p>
                  <span className="text-muted-foreground">When:</span> {bookingDate} {startTime} – {endTime}
                </p>
                <p>
                  <span className="text-muted-foreground">Professional:</span>{" "}
                  {catalog.staff.find((s) => s.id === staffId)?.displayName}
                </p>
                {resourceId ? (
                  <p>
                    <span className="text-muted-foreground">Room:</span>{" "}
                    {availableResources.find((r) => r.id === resourceId)?.name ??
                      resourcesQuery.data?.find((r) => r.id === resourceId)?.name}
                  </p>
                ) : null}
                <p className="font-semibold text-primary">Total: {formatKes(totalPrice)}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {mode === "staff" ? (
                  <div className="sm:col-span-2 rounded-lg border border-border bg-muted/20 p-3 text-sm">
                    <p>
                      <span className="text-muted-foreground">Customer:</span> {fullName}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Phone:</span> {phone}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="full-name">Full name</Label>
                      <Input
                        id="full-name"
                        data-testid="booking-full-name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        data-testid="booking-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+254…"
                        required
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {catalogQuery.error ? (
            <p className="text-sm text-destructive">Could not load booking catalog.</p>
          ) : null}

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" onClick={back} disabled={stepIndex === 0}>
              Back
            </Button>
            {currentStep === "confirm" ? (
              <Button
                type="button"
                className="bg-gradient-gold text-primary-foreground"
                disabled={!canProceed() || submitMutation.isPending}
                onClick={handleSubmit}
              >
                {submitMutation.isPending ? "Confirming…" : "Confirm booking"}
              </Button>
            ) : (
              <Button
                type="button"
                className="bg-gradient-gold text-primary-foreground"
                disabled={!canProceed() || catalogQuery.isLoading}
                onClick={next}
              >
                Continue
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function stepLabel(step: Step, staffSingular: string): string {
  switch (step) {
    case "branch":
      return "Choose branch";
    case "services":
      return "Select services";
    case "datetime":
      return "Pick date & time";
    case "staff":
      return `Choose your ${staffSingular.toLowerCase()}`;
    case "resource":
      return "Choose treatment room";
    case "confirm":
      return "Confirm details";
  }
  return step;
}

function stepDescription(step: Step, staffSingular: string): string {
  switch (step) {
    case "branch":
      return "Where would you like to be seen?";
    case "services":
      return "Select one or more services for your visit.";
    case "datetime":
      return "When works best for you?";
    case "staff":
      return `Available ${staffSingular.toLowerCase()}s based on your date and services.`;
    case "resource":
      return "Select an available room or facility for your session.";
    case "confirm":
      return "Review pricing and enter your contact details.";
  }
  return "";
}

function stepIcon(step: Step) {
  switch (step) {
    case "branch":
      return <MapPin className="h-5 w-5" />;
    case "services":
      return <Scissors className="h-5 w-5" />;
    case "datetime":
      return <Calendar className="h-5 w-5" />;
    case "staff":
      return <User className="h-5 w-5" />;
    case "resource":
      return <Armchair className="h-5 w-5" />;
    case "confirm":
      return <Clock className="h-5 w-5" />;
  }
  return <Clock className="h-5 w-5" />;
}
