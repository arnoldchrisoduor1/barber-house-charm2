"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, Truck } from "lucide-react";
import { toast } from "sonner";

import { CrudDialog } from "@/components/CrudDialog";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  advanceFieldJob,
  createFieldJob,
  fetchCoverageZones,
  fetchFieldJobs,
  type FieldJob,
} from "@/lib/api/mobile";
import { useEntityList } from "@/lib/api/crud";
import { pickRowField } from "@/lib/record-fields";

type Tab = "jobs" | "zones";

const NEXT_STATUS: Record<string, string> = {
  assigned: "en_route",
  en_route: "on_site",
  on_site: "done",
};

const emptyForm = {
  staff_id: "",
  booking_id: "",
  coverage_zone_id: "",
  visit_address: "",
  notes: "",
};

export default function FieldOperationsPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("jobs");
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(emptyForm);

  const jobsQuery = useQuery({
    queryKey: ["org", orgId, "field-jobs"],
    queryFn: () => fetchFieldJobs(orgId),
    enabled: !!orgId,
  });

  const zonesQuery = useQuery({
    queryKey: ["org", orgId, "coverage-zones"],
    queryFn: () => fetchCoverageZones(orgId),
    enabled: !!orgId && (tab === "zones" || open),
  });

  const { data: staff = [] } = useEntityList<Record<string, unknown>>(orgId, "staff");
  const { data: bookings = [] } = useEntityList<Record<string, unknown>>(orgId, "bookings");

  const staffName = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of staff) {
      map.set(String(s.id ?? s.ID ?? ""), String(pickRowField(s, "display_name") ?? "Pro"));
    }
    return map;
  }, [staff]);

  const createMut = useMutation({
    mutationFn: async () => {
      await createFieldJob(orgId, {
        staff_id: values.staff_id || undefined,
        booking_id: values.booking_id || undefined,
        coverage_zone_id: values.coverage_zone_id || undefined,
        visit_address: values.visit_address,
        notes: values.notes,
        status: "assigned",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "field-jobs"] });
      setOpen(false);
      setValues(emptyForm);
      toast.success("Field job created");
    },
    onError: (e: Error) => toast.error(e.message || "Create failed"),
  });

  const advanceMut = useMutation({
    mutationFn: (job: FieldJob) => {
      const next = NEXT_STATUS[job.status];
      return advanceFieldJob(orgId, job.id, next);
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "field-jobs"] });
      toast.success(`Status → ${row.status.replace(/_/g, " ")}`);
    },
    onError: (e: Error) => toast.error(e.message || "Advance failed"),
  });

  const jobs = jobsQuery.data ?? [];
  const zones = zonesQuery.data ?? [];

  return (
    <ModulePage
      title="Field Operations"
      feature="coverage_zones"
      description="Dispatch jobs, advance status, and link home visits."
    >
      <div className="mb-6 flex flex-wrap gap-2" data-testid="field-ops-page">
        <Button type="button" variant={tab === "jobs" ? "default" : "outline"} onClick={() => setTab("jobs")}>
          Field jobs
        </Button>
        <Button type="button" variant={tab === "zones" ? "default" : "outline"} onClick={() => setTab("zones")}>
          Coverage zones
        </Button>
        {tab === "jobs" ? (
          <Button type="button" className="w-full sm:ml-auto sm:w-auto" onClick={() => setOpen(true)} data-testid="field-job-add">
            <Plus className="mr-2 h-4 w-4" />
            New job
          </Button>
        ) : null}
      </div>

      {tab === "jobs" ? (
        <Card className="glass" data-testid="field-ops-dispatch">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Active field jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobsQuery.isLoading ? (
              <p className="text-muted-foreground">Loading jobs…</p>
            ) : jobs.length === 0 ? (
              <p className="text-muted-foreground">No field jobs yet.</p>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => {
                  const next = NEXT_STATUS[job.status];
                  return (
                    <div
                      key={job.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 p-3"
                      data-testid={`field-job-${job.id}`}
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {job.staff_id ? staffName.get(job.staff_id) ?? "Unassigned" : "Unassigned"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {job.visit_address || "No address"} ·{" "}
                          {job.booking_id ? `Booking ${job.booking_id.slice(0, 8)}` : "No booking"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded-full bg-primary/10 px-2 py-0.5 text-xs capitalize text-primary"
                          data-testid={`field-job-status-${job.id}`}
                        >
                          {job.status.replace(/_/g, " ")}
                        </span>
                        {next ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => advanceMut.mutate(job)}
                            disabled={advanceMut.isPending}
                            data-testid={`field-job-advance-${job.id}`}
                          >
                            Mark {next.replace(/_/g, " ")}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "zones" ? (
        <Card className="glass" data-testid="field-ops-zones">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Linked coverage zones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {zonesQuery.isLoading ? (
              <p className="text-muted-foreground">Loading zones…</p>
            ) : zones.length === 0 ? (
              <p className="text-muted-foreground">No zones. Manage them under Coverage Zones.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {zones.map((z) => (
                  <li key={z.id} className="flex justify-between rounded-lg border border-border/40 px-3 py-2">
                    <span>{z.name}</span>
                    <span className="text-muted-foreground">
                      {z.city} · {z.radius_km} km
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      <CrudDialog
        open={open}
        onOpenChange={setOpen}
        title="New field job"
        onSubmit={() => createMut.mutate()}
        loading={createMut.isPending}
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Staff</Label>
            <Select value={values.staff_id} onValueChange={(v) => setValues((s) => ({ ...s, staff_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Assign staff" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => {
                  const id = String(s.id ?? s.ID ?? "");
                  return (
                    <SelectItem key={id} value={id}>
                      {String(pickRowField(s, "display_name") ?? id)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Booking (optional)</Label>
            <Select
              value={values.booking_id || "__none__"}
              onValueChange={(v) => setValues((s) => ({ ...s, booking_id: v === "__none__" ? "" : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Link booking" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {bookings.slice(0, 20).map((b) => {
                  const id = String(b.id ?? b.ID ?? "");
                  return (
                    <SelectItem key={id} value={id}>
                      {id.slice(0, 8)} · {String(pickRowField(b, "status") ?? "")}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Coverage zone</Label>
            <Select
              value={values.coverage_zone_id || "__none__"}
              onValueChange={(v) => setValues((s) => ({ ...s, coverage_zone_id: v === "__none__" ? "" : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {(zonesQuery.data ?? []).map((z) => (
                  <SelectItem key={z.id} value={z.id}>
                    {z.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="job-address">Visit address</Label>
            <Input
              id="job-address"
              value={values.visit_address}
              onChange={(e) => setValues((s) => ({ ...s, visit_address: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="job-notes">Notes</Label>
            <Textarea
              id="job-notes"
              value={values.notes}
              onChange={(e) => setValues((s) => ({ ...s, notes: e.target.value }))}
              rows={2}
            />
          </div>
        </div>
      </CrudDialog>
    </ModulePage>
  );
}
