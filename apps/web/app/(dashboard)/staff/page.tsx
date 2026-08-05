"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { Mail, Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { CrudDialog } from "@/components/CrudDialog";
import { EntityForm } from "@/components/EntityForm";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessCategory } from "@/hooks/useBusinessCategory";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { api } from "@/lib/api-client";
import { useEntityCreate, useEntityList, useEntityUpdate } from "@/lib/api/crud";
import { buildStaffConfig, BEAUTY_SERVICE_CATEGORIES } from "@/lib/mode-crud-configs";
import { pickRowField } from "@/lib/record-fields";
import { cn } from "@/lib/utils";

type StaffRow = Record<string, unknown>;

function rowId(row: StaffRow): string {
  return String(row.id ?? row.ID ?? "");
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function roleLabel(role: string, terms?: { seniorStaff: string; juniorStaff: string }): string {
  if (terms && role === "senior_barber") return terms.seniorStaff;
  if (terms && role === "junior_barber") return terms.juniorStaff;
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const ROLE_COLORS: Record<string, string> = {
  ceo: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  director: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  branch_manager: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  senior_barber: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  junior_barber: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  receptionist: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
};

export default function StaffPage() {
  const { activeOrg } = useAuth();
  const { terms, mode } = useBusinessCategory();
  const staffConfig = useMemo(() => buildStaffConfig(terms), [terms]);
  const orgId = activeOrg?.id;
  const qc = useQueryClient();
  const { apiParams } = useBranchFilter();
  const { data: staff = [], isLoading, error } = useEntityList<StaffRow>(orgId, "staff", apiParams);
  const createMut = useEntityCreate(orgId, "staff");
  const updateMut = useEntityUpdate(orgId, "staff");

  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("senior_barber");
  const [offboardOpen, setOffboardOpen] = useState(false);
  const [offboardTarget, setOffboardTarget] = useState<StaffRow | null>(null);
  const [offboardReason, setOffboardReason] = useState("");
  const [reassignStaffId, setReassignStaffId] = useState("");
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const initialValues = useMemo(() => {
    const base: Record<string, string> = {};
    for (const f of staffConfig.fields) base[f.name] = "";
    return base;
  }, [staffConfig]);
  const [values, setValues] = useState<Record<string, string>>(initialValues);

  function openCreate() {
    setEditing(null);
    setValues(initialValues);
    setOpen(true);
  }

  function openEdit(row: StaffRow) {
    setEditing(row);
    const next = { ...initialValues };
    for (const f of staffConfig.fields) {
      const v = pickRowField(row, f.name);
      if (f.name === "specialties" && Array.isArray(v)) {
        next[f.name] = v.join(", ");
      } else {
        next[f.name] = v != null ? String(v) : "";
      }
    }
    setValues(next);
    setOpen(true);
  }

  const inviteMut = useMutation({
    mutationFn: () =>
      api.post<{ email_delivered?: boolean }>(`/organizations/${orgId}/staff-invites`, {
        email: inviteEmail,
        role: inviteRole,
        displayName: inviteName || undefined,
      }),
    onSuccess: (data) => {
      if (data?.email_delivered) {
        toast.success("Invite sent by email");
      } else {
        toast.success("Invite created — email not delivered (SMTP dry-run or not configured)");
      }
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("senior_barber");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Invite failed"),
  });

  async function saveInvite() {
    if (!orgId || !inviteEmail.trim()) return;
    await inviteMut.mutateAsync();
  }

  const offboardMut = useMutation({
    mutationFn: async () => {
      if (!orgId || !offboardTarget) return;
      return api.post(`/organizations/${orgId}/staff/${rowId(offboardTarget)}/offboard`, {
        reassign_to_staff_id: reassignStaffId || null,
        reason: offboardReason,
      });
    },
    onSuccess: () => {
      toast.success("Staff member offboarded");
      qc.invalidateQueries({ queryKey: ["org", orgId, "staff"] });
      setOffboardOpen(false);
      setOffboardTarget(null);
      setOffboardReason("");
      setReassignStaffId("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Offboard failed"),
  });

  async function saveOffboard() {
    if (!offboardReason.trim()) return;
    await offboardMut.mutateAsync();
  }

  function openOffboard(row: StaffRow, e: MouseEvent) {
    e.stopPropagation();
    setOffboardTarget(row);
    setOffboardReason("");
    setReassignStaffId("");
    setOffboardOpen(true);
  }

  async function save() {
    const body = staffConfig.mapFormToBody!(values);
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: rowId(editing), body });
        toast.success("Staff updated");
      } else {
        await createMut.mutateAsync(body);
        toast.success("Staff member added");
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <ModulePage title={terms.staffPageTitle} description="Your team directory and commission settings.">
      <div className="mb-6 flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setInviteOpen(true)}
          disabled={!orgId}
          className="gap-2"
          data-testid="invite-staff-btn"
        >
          <Mail className="h-4 w-4" />
          Invite staff
        </Button>
        <Button onClick={openCreate} disabled={!orgId} className="gap-2">
          <Plus className="h-4 w-4" />
          Add staff
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading staff…</p>}
      {error && <p className="text-destructive">Failed to load staff.</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {staff.map((row) => {
          const name = String(pickRowField(row, "display_name") ?? "Staff");
          const role = String(pickRowField(row, "role") ?? "staff");
          const isActive = pickRowField(row, "is_active") !== false;
          const commission = Number(pickRowField(row, "commission_rate") ?? 0);
          const rawSpecialties = pickRowField(row, "specialties");
          const specialties = Array.isArray(rawSpecialties)
            ? rawSpecialties.map(String)
            : String(rawSpecialties ?? "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

          return (
            <Card
              key={rowId(row)}
              className="glass cursor-pointer transition hover:-translate-y-0.5 hover:shadow-glow"
              onClick={() => openEdit(row)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-gold text-sm font-bold text-primary-foreground">
                    {initials(name)}
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{name}</CardTitle>
                    <span
                      className={cn(
                        "mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
                        ROLE_COLORS[role] ?? "bg-muted text-muted-foreground border-border",
                      )}
                    >
                      {roleLabel(role, terms)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Commission: <span className="font-medium text-foreground">{commission}%</span>
                </p>
                {specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {specialties.map((spec) => (
                      <span
                        key={spec}
                        className="rounded-full border border-border/50 bg-background/50 px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                )}
                {isActive && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full text-destructive hover:text-destructive"
                    data-testid="staff-offboard-btn"
                    onClick={(e) => openOffboard(row, e)}
                  >
                    Offboard
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isLoading && staff.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">No staff members yet.</p>
      )}

      <CrudDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit staff" : "Add staff"}
        onSubmit={save}
        loading={createMut.isPending || updateMut.isPending}
      >
        <EntityForm
          fields={staffConfig.fields.filter((f) => f.name !== "specialties" || mode !== "beauty")}
          values={values}
          onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
        />
        {mode === "beauty" ? (
          <div className="space-y-2 pt-2">
            <Label>Specialties</Label>
            <div className="grid grid-cols-2 gap-2">
              {BEAUTY_SERVICE_CATEGORIES.map((cat) => {
                const selected = (values.specialties ?? "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                const checked = selected.includes(cat);
                return (
                  <label key={cat} className="flex items-center gap-2 text-sm capitalize">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = checked
                          ? selected.filter((s) => s !== cat)
                          : [...selected, cat];
                        setValues((prev) => ({ ...prev, specialties: next.join(", ") }));
                      }}
                    />
                    {cat.replace(/_/g, " ")}
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
      </CrudDialog>

      <CrudDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="Invite staff member"
        onSubmit={saveInvite}
        submitLabel="Send invite"
        loading={inviteMut.isPending}
      >
        <div className="space-y-4" data-testid="staff-invite-form">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Display name</Label>
            <Input id="invite-name" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger data-testid="staff-invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="senior_barber">{terms.seniorStaff}</SelectItem>
                <SelectItem value="junior_barber">{terms.juniorStaff}</SelectItem>
                <SelectItem value="branch_manager">Branch manager</SelectItem>
                <SelectItem value="receptionist">Receptionist</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            An email invite will be sent. Staff cannot self-register without this invite.
          </p>
        </div>
      </CrudDialog>

      <CrudDialog
        open={offboardOpen}
        onOpenChange={setOffboardOpen}
        title="Offboard staff member"
        description="Clients will be reassigned, seat rentals cleared, and future bookings cancelled."
        onSubmit={saveOffboard}
        submitLabel="Confirm offboard"
        loading={offboardMut.isPending}
      >
        <div className="space-y-4" data-testid="staff-offboard-form">
          <p className="text-sm text-muted-foreground">
            Offboarding:{" "}
            <span className="font-medium text-foreground">
              {offboardTarget ? String(pickRowField(offboardTarget, "display_name") ?? "Staff") : "—"}
            </span>
          </p>
          <div className="space-y-1.5">
            <Label>Reassign clients to</Label>
            <Select value={reassignStaffId || "__none"} onValueChange={(v) => setReassignStaffId(v === "__none" ? "" : v)}>
              <SelectTrigger data-testid="offboard-reassign-select">
                <SelectValue placeholder="Select barber" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Unassigned</SelectItem>
                {staff
                  .filter((row) => rowId(row) !== (offboardTarget ? rowId(offboardTarget) : ""))
                  .map((row) => (
                    <SelectItem key={rowId(row)} value={rowId(row)}>
                      {String(pickRowField(row, "display_name") ?? "Staff")}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offboard-reason">Reason (required)</Label>
            <Textarea
              id="offboard-reason"
              value={offboardReason}
              onChange={(e) => setOffboardReason(e.target.value)}
              rows={3}
              data-testid="offboard-reason"
            />
          </div>
        </div>
      </CrudDialog>
    </ModulePage>
  );
}
