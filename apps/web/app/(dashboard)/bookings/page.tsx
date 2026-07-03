"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus, Search } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { Feature } from "@/components/Feature";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentStaffId } from "@/hooks/useCurrentStaffId";
import { useStaffScope } from "@/hooks/useStaffScope";
import { api } from "@/lib/api-client";
import { formatDate, formatTime } from "@/lib/format";
import { pickRowField } from "@/lib/record-fields";

type BookingRow = Record<string, unknown>;

const STATUSES = ["scheduled", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"] as const;
const NEXT_STATUS: Record<string, string> = {
  scheduled: "confirmed",
  confirmed: "checked_in",
  checked_in: "in_progress",
  in_progress: "completed",
};

export default function BookingsPage() {
  const { activeOrg } = useAuth();
  const staffId = useCurrentStaffId();
  const { isStaffScoped } = useStaffScope();
  const qc = useQueryClient();
  const orgId = activeOrg?.id ?? "";
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["org", orgId, "customers", "booking-dialog"],
    enabled: !!orgId && dialogOpen,
    queryFn: async () => {
      const resp = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/customers`);
      return resp.data ?? [];
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["org", orgId, "bookings", selectedDate, statusFilter, staffId],
    enabled: !!orgId,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      const resp = await api.get<{ data: BookingRow[] }>(`/organizations/${orgId}/bookings`, { params });
      return resp.data ?? [];
    },
  });

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers
      .filter((row) => {
        const name = String(pickRowField(row, "full_name") ?? pickRowField(row, "fullName") ?? "").toLowerCase();
        const phone = String(pickRowField(row, "phone") ?? "").toLowerCase();
        return name.includes(q) || phone.includes(q);
      })
      .slice(0, 8);
  }, [customers, customerSearch]);

  const filtered = useMemo(() => {
    return (data ?? []).filter((row) => {
      const date = String(pickRowField(row, "booking_date") ?? pickRowField(row, "bookingDate") ?? "");
      const rowStaff = String(pickRowField(row, "staff_id") ?? pickRowField(row, "staffId") ?? "");
      const dateMatch = date.startsWith(selectedDate);
      const staffMatch = !staffId || !rowStaff || rowStaff === staffId;
      return dateMatch && staffMatch;
    });
  }, [data, selectedDate, staffId]);

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => {
      const row = (data ?? []).find((r) => String(pickRowField(r, "id")) === id);
      return api.put(`/organizations/${orgId}/bookings/${id}`, {
        customerId: String(pickRowField(row ?? {}, "customer_id") ?? pickRowField(row ?? {}, "customerId") ?? ""),
        bookingDate: selectedDate,
        startTime: String(pickRowField(row ?? {}, "start_time") ?? pickRowField(row ?? {}, "startTime") ?? "09:00"),
        endTime: String(pickRowField(row ?? {}, "end_time") ?? pickRowField(row ?? {}, "endTime") ?? "09:30"),
        status,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", orgId, "bookings"] }),
  });

  function closeBookingDialog() {
    setDialogOpen(false);
    setSelectedCustomer(null);
    setCustomerSearch("");
  }

  return (
    <AppShell title={isStaffScoped ? "Your appointments" : "Bookings"}>
      <Feature flag="bookings">
        {isStaffScoped ? (
          <p className="mb-4 text-sm text-muted-foreground">Today&apos;s schedule and upcoming appointments.</p>
        ) : null}
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label htmlFor="booking-date">Date</Label>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Input
                id="booking-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
                data-testid="booking-date-picker"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]" data-testid="booking-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button data-testid="create-booking-btn" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New booking
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeBookingDialog())}>
            <DialogContent
              className="max-h-[90vh] max-w-3xl overflow-y-auto"
              onPointerDownOutside={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>Create booking for customer</DialogTitle>
              </DialogHeader>
              {!selectedCustomer ? (
                <div className="space-y-4" data-testid="staff-booking-customer-search">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Search customer by name or phone…"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      data-testid="staff-booking-search-input"
                    />
                  </div>
                  <div className="space-y-2">
                    {customersLoading ? (
                      <p className="text-sm text-muted-foreground">Loading customers…</p>
                    ) : null}
                    {filteredCustomers.map((row) => {
                      const id = String(pickRowField(row, "id") ?? "");
                      const name = String(pickRowField(row, "full_name") ?? pickRowField(row, "fullName") ?? "Guest");
                      const phone = String(pickRowField(row, "phone") ?? pickRowField(row, "Phone") ?? "");
                      if (!id) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm hover:border-primary/40"
                          data-testid={`staff-booking-customer-${id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedCustomer({ id, name, phone });
                          }}
                        >
                          <span className="font-medium">{name}</span>
                          <span className="text-muted-foreground">{phone}</span>
                        </button>
                      );
                    })}
                    {filteredCustomers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No customers match your search.</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div data-testid="staff-booking-wizard">
                  <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                    <span>
                      Booking for <strong>{selectedCustomer.name}</strong> ({selectedCustomer.phone})
                    </span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>
                      Change customer
                    </Button>
                  </div>
                  <BookingWizard
                    mode="staff"
                    orgId={orgId}
                    title="Book on behalf of customer"
                    customerName={selectedCustomer.name}
                    customerPhone={selectedCustomer.phone}
                    onStaffBooked={() => {
                      qc.invalidateQueries({ queryKey: ["org", orgId, "bookings"] });
                      closeBookingDialog();
                    }}
                  />
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? <p className="text-muted-foreground">Loading bookings…</p> : null}
        {error ? <p className="text-destructive">Failed to load bookings.</p> : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="booking-cards">
          {filtered.length === 0 && !isLoading ? (
            <Card className="glass sm:col-span-2 xl:col-span-3">
              <CardContent className="py-8 text-center text-muted-foreground">No bookings for this date.</CardContent>
            </Card>
          ) : (
            filtered.map((row) => {
              const id = String(pickRowField(row, "id") ?? "");
              const status = String(pickRowField(row, "status") ?? "scheduled");
              const start = String(pickRowField(row, "start_time") ?? pickRowField(row, "startTime") ?? "");
              const end = String(pickRowField(row, "end_time") ?? pickRowField(row, "endTime") ?? "");
              const next = NEXT_STATUS[status];
              return (
                <Card key={id} className="glass">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{formatTime(start)} – {formatTime(end)}</span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs capitalize text-primary">
                        {status.replace(/_/g, " ")}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{formatDate(selectedDate)}</p>
                    {next ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus.mutate({ id, status: next })}
                        disabled={updateStatus.isPending}
                        data-testid={`advance-status-${id}`}
                      >
                        Mark {next.replace(/_/g, " ")}
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </Feature>
    </AppShell>
  );
}
