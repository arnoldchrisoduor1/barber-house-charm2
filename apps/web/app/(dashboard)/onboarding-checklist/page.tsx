"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Rocket } from "lucide-react";
import { toast } from "sonner";

import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import { useEntityList } from "@/lib/api/crud";
import { pickRowField } from "@/lib/record-fields";

type ProgressRow = {
  staff_id: string;
  staff_name: string;
  started_at: string;
  completed_count: number;
  total_count: number;
  items: Array<{
    template_id: string;
    label: string;
    sort_order: number;
    done: boolean;
  }>;
};

type StaffRow = Record<string, unknown>;

export default function OnboardingChecklistPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const qc = useQueryClient();
  const { data: staff = [] } = useEntityList<StaffRow>(orgId, "staff");

  const [enrollStaffId, setEnrollStaffId] = useState("");
  const [newItemLabel, setNewItemLabel] = useState("");

  const progressQuery = useQuery({
    queryKey: ["org", orgId, "onboarding-progress"],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await api.get<{ data: ProgressRow[] }>(`/organizations/${orgId}/onboarding/progress`);
      return res.data ?? [];
    },
  });

  const enrollMut = useMutation({
    mutationFn: async (staffId: string) =>
      api.post(`/organizations/${orgId}/onboarding/enroll`, { staff_id: staffId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "onboarding-progress"] });
      toast.success("Onboarding started");
      setEnrollStaffId("");
    },
    onError: (e: Error) => toast.error(e.message || "Enroll failed"),
  });

  const toggleMut = useMutation({
    mutationFn: async (body: { staff_id: string; template_id: string }) =>
      api.post(`/organizations/${orgId}/onboarding/toggle`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", orgId, "onboarding-progress"] }),
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  });

  const addTemplateMut = useMutation({
    mutationFn: async (label: string) =>
      api.post(`/organizations/${orgId}/onboarding/templates`, { label }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "onboarding-progress"] });
      toast.success("Checklist item added");
      setNewItemLabel("");
    },
    onError: (e: Error) => toast.error(e.message || "Add failed"),
  });

  const rows = progressQuery.data ?? [];

  return (
    <ModulePage
      title="Onboarding Checklist"
      feature="staff_onboarding"
      description="Track new-hire progress through their first 30 days."
    >
      <div className="space-y-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Rocket className="h-5 w-5 text-primary" />
              Enroll new hire
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Select value={enrollStaffId} onValueChange={setEnrollStaffId}>
              <SelectTrigger className="w-full min-w-0 sm:w-[220px]">
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((row) => {
                  const id = String(pickRowField(row, "id") ?? "");
                  const name = String(pickRowField(row, "display_name") ?? id);
                  return (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button
              data-testid="onboarding-enroll-btn"
              disabled={!enrollStaffId || enrollMut.isPending}
              onClick={() => enrollMut.mutate(enrollStaffId)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Start onboarding
            </Button>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="pt-6 flex gap-2">
            <Input
              placeholder="Add checklist item…"
              value={newItemLabel}
              onChange={(e) => setNewItemLabel(e.target.value)}
            />
            <Button
              variant="outline"
              disabled={!newItemLabel.trim() || addTemplateMut.isPending}
              onClick={() => addTemplateMut.mutate(newItemLabel.trim())}
            >
              Add item
            </Button>
          </CardContent>
        </Card>

        {progressQuery.isLoading && <p className="text-muted-foreground">Loading…</p>}
        {rows.length === 0 && !progressQuery.isLoading && (
          <p className="text-muted-foreground">No active onboarding records. Enroll a new hire above.</p>
        )}

        {rows.map((person) => {
          const pct =
            person.total_count > 0 ? Math.round((person.completed_count / person.total_count) * 100) : 0;
          return (
            <Card key={person.staff_id} className="glass" data-testid={`onboarding-card-${person.staff_id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{person.staff_name}</CardTitle>
                  {person.started_at && (
                    <span className="text-xs text-muted-foreground">started {person.started_at}</span>
                  )}
                </div>
                <Progress value={pct} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {person.completed_count}/{person.total_count} complete · {pct}%
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {person.items.map((item) => (
                  <label key={item.template_id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={item.done}
                      data-testid={`onboarding-item-${person.staff_id}-${item.template_id}`}
                      onCheckedChange={() =>
                        toggleMut.mutate({ staff_id: person.staff_id, template_id: item.template_id })
                      }
                    />
                    <span className={item.done ? "line-through text-muted-foreground" : ""}>{item.label}</span>
                  </label>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ModulePage>
  );
}
