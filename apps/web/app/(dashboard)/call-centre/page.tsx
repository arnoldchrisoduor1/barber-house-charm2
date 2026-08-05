"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, MessageSquare, Phone, Plus } from "lucide-react";
import { toast } from "sonner";

import { ModulePage } from "@/components/ModulePage";
import { StatTile } from "@/components/dashboard/StatTile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import {
  convertEnquiryToBooking,
  createDeskEnquiry,
  fetchEnquiries,
  markEnquiryRead,
  type Enquiry,
} from "@/lib/api/enquiry-desk";

interface CallCentreStats {
  total_enquiries: number;
  unread_enquiries: number;
  total_bookings: number;
  pending_bookings: number;
}

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function CallCentrePage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [bookingDate, setBookingDate] = useState(tomorrowISO());
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("10:30");

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["org", orgId, "analytics-call-centre"],
    enabled: !!orgId,
    queryFn: () => api.get<CallCentreStats>(`/organizations/${orgId}/analytics/call-centre`),
  });

  const enquiriesQuery = useQuery({
    queryKey: ["org", orgId, "enquiries"],
    queryFn: () => fetchEnquiries(orgId),
    enabled: !!orgId,
  });

  const createMut = useMutation({
    mutationFn: () => createDeskEnquiry(orgId, { name, phone, subject, message: subject }),
    onSuccess: () => {
      setName("");
      setPhone("");
      setSubject("");
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "enquiries"] });
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "analytics-call-centre"] });
      toast.success("Enquiry logged");
    },
    onError: (e: Error) => toast.error(e.message || "Failed"),
  });

  const readMut = useMutation({
    mutationFn: (id: string) => markEnquiryRead(orgId, id),
    onSuccess: (row) => {
      setSelected(row);
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "enquiries"] });
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "analytics-call-centre"] });
    },
  });

  const convertMut = useMutation({
    mutationFn: (id: string) =>
      convertEnquiryToBooking(orgId, id, {
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
      }),
    onSuccess: (row) => {
      setSelected(row);
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "enquiries"] });
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "analytics-call-centre"] });
      toast.success("Converted to booking");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to convert"),
  });

  const enquiries = enquiriesQuery.data ?? [];

  return (
    <ModulePage title="Haus Connect" feature="advanced_analytics" description="Inbound enquiries and booking conversion.">
      {error ? <p className="text-destructive">Failed to load enquiry stats.</p> : null}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="call-centre-stats">
        <StatTile icon={MessageSquare} label="Total enquiries" value={stats ? String(stats.total_enquiries) : "—"} loading={isLoading} />
        <StatTile icon={Phone} label="Unread" value={stats ? String(stats.unread_enquiries) : "—"} loading={isLoading} />
        <StatTile icon={CalendarCheck} label="Bookings" value={stats ? String(stats.total_bookings) : "—"} loading={isLoading} />
        <StatTile icon={CalendarCheck} label="Pending" value={stats ? String(stats.pending_bookings) : "—"} loading={isLoading} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2" data-testid="enquiry-desk">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Log enquiry</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="enquiry-name" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="enquiry-phone" />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="enquiry-subject" />
            </div>
            <Button className="gap-2" disabled={!name} onClick={() => createMut.mutate()} data-testid="enquiry-create">
              <Plus className="h-4 w-4" />
              Add enquiry
            </Button>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
          </CardHeader>
          <CardContent className="max-h-80 space-y-2 overflow-y-auto">
            {enquiries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No enquiries yet.</p>
            ) : (
              enquiries.map((enq) => (
                <button
                  key={enq.id}
                  type="button"
                  className="flex w-full items-start justify-between gap-2 rounded-md border p-3 text-left hover:bg-muted/50"
                  onClick={() => {
                    setSelected(enq);
                    if (!enq.isRead) readMut.mutate(enq.id);
                  }}
                  data-testid="enquiry-row"
                >
                  <div>
                    <p className="font-medium">{enq.name}</p>
                    <p className="text-xs text-muted-foreground">{enq.subject}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {!enq.isRead ? <Badge>New</Badge> : null}
                    <Badge variant="outline">{enq.status}</Badge>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {selected ? (
        <Card className="glass mt-6">
          <CardHeader>
            <CardTitle>Convert to booking — {selected.name}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} data-testid="enquiry-booking-date" />
            </div>
            <div className="space-y-2">
              <Label>Start</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} data-testid="enquiry-start-time" />
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} data-testid="enquiry-end-time" />
            </div>
            {selected.status !== "converted" ? (
              <Button
                className="md:col-span-3"
                onClick={() => convertMut.mutate(selected.id)}
                disabled={convertMut.isPending}
                data-testid="enquiry-convert"
              >
                Convert to booking
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground md:col-span-3" data-testid="enquiry-converted">
                Converted — booking {selected.convertedBookingId?.slice(0, 8)}
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </ModulePage>
  );
}
