"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { CrudDialog } from "@/components/CrudDialog";
import { DataTable } from "@/components/DataTable";
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
import { api } from "@/lib/api-client";
import { useEntityList } from "@/lib/api/crud";
import { pickRowField } from "@/lib/record-fields";

type TimeOffRow = Record<string, unknown>;
type StaffRow = Record<string, unknown>;

export default function TimeOffPage() {
  const { activeOrg, me } = useAuth();
  const orgId = activeOrg?.id;
  const qc = useQueryClient();
  const { data: staff = [] } = useEntityList<StaffRow>(orgId, "staff");

  const [open, setOpen] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const listQuery = useQuery({
    queryKey: ["org", orgId, "time-off"],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await api.get<{ data: TimeOffRow[] }>(`/organizations/${orgId}/time-off`);
      return res.data ?? [];
    },
  });

  const createMut = useMutation({
    mutationFn: () =>
      api.post(`/organizations/${orgId}/time-off`, {
        staff_id: staffId,
        start_date: startDate,
        end_date: endDate,
        reason,
      }),
    onSuccess: () => {
      toast.success("Time-off request submitted");
      qc.invalidateQueries({ queryKey: ["org", orgId, "time-off"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Request failed"),
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      api.post(`/organizations/${orgId}/time-off/${id}/${approve ? "approve" : "deny"}`, { note: "" }),
    onSuccess: () => {
      toast.success("Request updated");
      qc.invalidateQueries({ queryKey: ["org", orgId, "time-off"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Review failed"),
  });

  const staffName = (id: string) => {
    const row = staff.find((s) => String(pickRowField(s, "id")) === id);
    return row ? String(pickRowField(row, "display_name") ?? "Staff") : id.slice(0, 8);
  };

  const isManager = (me?.roles ?? []).some((r) =>
    ["ceo", "director", "branch_manager"].includes(r),
  );

  return (
    <ModulePage title="Time Off" feature="staff_time_off" description="Request leave and approve team time off.">
      <Card className="glass">
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Requests</CardTitle>
          <Button size="sm" className="gap-2" onClick={() => setOpen(true)} data-testid="time-off-request-btn">
            <Plus className="h-4 w-4" /> Request time off
          </Button>
        </CardHeader>
        <CardContent>
          {listQuery.isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
          <DataTable
            columns={[
              {
                key: "staff_id",
                header: "Staff",
                render: (row) => staffName(String(pickRowField(row, "staff_id") ?? "")),
              },
              {
                key: "start_date",
                header: "Start",
                render: (row) => String(pickRowField(row, "start_date") ?? "—").slice(0, 10),
              },
              {
                key: "end_date",
                header: "End",
                render: (row) => String(pickRowField(row, "end_date") ?? "—").slice(0, 10),
              },
              { key: "status", header: "Status" },
              {
                key: "reason",
                header: "Reason",
                render: (row) => String(pickRowField(row, "reason") ?? "—"),
              },
              {
                key: "actions",
                header: "",
                render: (row) => {
                  if (!isManager || String(pickRowField(row, "status")) !== "pending") return null;
                  const id = String(pickRowField(row, "id") ?? "");
                  return (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" data-testid="time-off-approve-btn" onClick={() => reviewMut.mutate({ id, approve: true })}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => reviewMut.mutate({ id, approve: false })}>
                        Deny
                      </Button>
                    </div>
                  );
                },
              },
            ]}
            rows={listQuery.data ?? []}
            emptyMessage="No time-off requests yet."
          />
        </CardContent>
      </Card>

      <CrudDialog open={open} onOpenChange={setOpen} title="Request time off" onSubmit={() => createMut.mutate()} loading={createMut.isPending}>
        <div className="space-y-4" data-testid="time-off-form">
          <div className="space-y-1">
            <Label>Staff</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger data-testid="time-off-staff-select">
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((row) => {
                  const id = String(pickRowField(row, "id") ?? "");
                  return (
                    <SelectItem key={id} value={id}>
                      {String(pickRowField(row, "display_name") ?? "Staff")}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="time-off-start">Start date</Label>
              <Input id="time-off-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} data-testid="time-off-start" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="time-off-end">End date</Label>
              <Input id="time-off-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} data-testid="time-off-end" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="time-off-reason">Reason</Label>
            <Textarea id="time-off-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </div>
        </div>
      </CrudDialog>
    </ModulePage>
  );
}
