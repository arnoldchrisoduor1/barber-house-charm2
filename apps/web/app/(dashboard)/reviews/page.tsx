"use client";

import { useMemo, useState } from "react";
import { MessageSquare, Plus, Star } from "lucide-react";
import { toast } from "sonner";

import { CrudDialog } from "@/components/CrudDialog";
import { EntityForm, type FormFieldDef } from "@/components/EntityForm";
import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StarRating } from "@/components/ui/star-rating";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentStaffId } from "@/hooks/useCurrentStaffId";
import { useStaffScope } from "@/hooks/useStaffScope";
import { useEntityCreate, useEntityDelete, useEntityList, useEntityUpdate } from "@/lib/api/crud";
import { pickRowField } from "@/lib/record-fields";
import { formatDate } from "@/lib/format";

type ReviewRow = Record<string, unknown>;
type StaffRow = Record<string, unknown>;

function rowId(row: ReviewRow): string {
  return String(row.id ?? row.ID ?? "");
}

const REVIEW_FIELDS: FormFieldDef[] = [
  { name: "customer_id", label: "Customer ID", required: true },
  { name: "staff_id", label: "Staff ID" },
  { name: "rating", label: "Rating (1-5)", type: "number" },
  { name: "comment", label: "Comment", type: "textarea" },
  { name: "reply", label: "Reply (optional)", type: "textarea" },
];

export default function ReviewsPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const currentStaffId = useCurrentStaffId();
  const { staffId, isStaffScoped } = useStaffScope();
  const defaultStaffFilter = isStaffScoped && (staffId ?? currentStaffId) ? (staffId ?? currentStaffId)! : "all";
  const { data: reviews = [], isLoading, error } = useEntityList<ReviewRow>(orgId, "reviews");
  const { data: staff = [] } = useEntityList<StaffRow>(orgId, "staff");
  const createMut = useEntityCreate(orgId, "reviews");
  const updateMut = useEntityUpdate(orgId, "reviews");
  const deleteMut = useEntityDelete(orgId, "reviews");

  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ReviewRow | null>(null);
  const [values, setValues] = useState<Record<string, string>>({
    customer_id: "",
    staff_id: "",
    rating: "5",
    comment: "",
    reply: "",
  });

  const effectiveStaffFilter = staffFilter === "all" && defaultStaffFilter !== "all" ? defaultStaffFilter : staffFilter;

  const staffNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of staff) {
      map.set(String(row.id ?? row.ID ?? ""), String(pickRowField(row, "display_name") ?? "Staff"));
    }
    return map;
  }, [staff]);

  const filtered = useMemo(() => {
    if (effectiveStaffFilter === "all") return reviews;
    return reviews.filter((row) => String(pickRowField(row, "staff_id") ?? "") === effectiveStaffFilter);
  }, [reviews, effectiveStaffFilter]);

  const avgRating = useMemo(() => {
    if (filtered.length === 0) return 0;
    const sum = filtered.reduce((acc, row) => acc + Number(pickRowField(row, "rating") ?? 0), 0);
    return sum / filtered.length;
  }, [filtered]);

  function openCreate() {
    setEditing(null);
    setValues({
      customer_id: "",
      staff_id: currentStaffId ?? "",
      rating: "5",
      comment: "",
      reply: "",
    });
    setOpen(true);
  }

  function openEdit(row: ReviewRow) {
    setEditing(row);
    setValues({
      customer_id: String(pickRowField(row, "customer_id") ?? ""),
      staff_id: String(pickRowField(row, "staff_id") ?? ""),
      rating: String(pickRowField(row, "rating") ?? "5"),
      comment: String(pickRowField(row, "comment") ?? ""),
      reply: String(pickRowField(row, "reply") ?? ""),
    });
    setOpen(true);
  }

  async function save() {
    const body: Record<string, unknown> = {
      customer_id: values.customer_id,
      rating: Number(values.rating) || 5,
      comment: values.comment,
    };
    if (values.staff_id.trim()) body.staff_id = values.staff_id.trim();
    if (values.reply.trim()) body.reply = values.reply.trim();

    try {
      if (editing) {
        await updateMut.mutateAsync({ id: rowId(editing), body });
        toast.success("Review updated");
      } else {
        await createMut.mutateAsync(body);
        toast.success("Review added");
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function remove(row: ReviewRow) {
    try {
      await deleteMut.mutateAsync(rowId(row));
      toast.success("Review deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const body = (
    <>
      <Card className="glass mb-6">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
              <Star className="h-7 w-7 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <p className="text-3xl font-bold">{avgRating.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">
                Average rating · {filtered.length} review{filtered.length !== 1 ? "s" : ""}
              </p>
              <StarRating value={avgRating} size="sm" className="mt-1" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={effectiveStaffFilter} onValueChange={setStaffFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All staff</SelectItem>
                {staff.map((row) => {
                  const id = String(row.id ?? row.ID ?? "");
                  return (
                    <SelectItem key={id} value={id}>
                      {String(pickRowField(row, "display_name") ?? "Staff")}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button onClick={openCreate} disabled={!orgId} className="gap-2">
              <Plus className="h-4 w-4" />
              Add review
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && <p className="text-muted-foreground">Loading reviews…</p>}
      {error && <p className="text-destructive">Failed to load reviews.</p>}

      <div className="space-y-3">
        {filtered.map((row) => {
          const rating = Number(pickRowField(row, "rating") ?? 0);
          const comment = String(pickRowField(row, "comment") ?? "");
          const reply = String(pickRowField(row, "reply") ?? "");
          const staffId = String(pickRowField(row, "staff_id") ?? "");
          const createdAt = String(pickRowField(row, "created_at") ?? pickRowField(row, "createdAt") ?? "");

          return (
            <Card key={rowId(row)} className="glass">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <StarRating value={rating} size="sm" />
                    {staffId && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {staffNameById.get(staffId) ?? "Staff member"}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => remove(row)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {comment && <p className="text-sm">{comment}</p>}
                {reply && (
                  <div className="flex gap-2 rounded-lg border border-border/50 bg-muted/30 p-3">
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="text-sm text-muted-foreground">{reply}</p>
                  </div>
                )}
                {createdAt && (
                  <p className="text-xs text-muted-foreground">{formatDate(createdAt)}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isLoading && filtered.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">No reviews yet.</p>
      )}

      <CrudDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit review" : "Add review"}
        onSubmit={save}
        loading={createMut.isPending || updateMut.isPending}
      >
        <EntityForm
          fields={REVIEW_FIELDS}
          values={values}
          onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
        />
      </CrudDialog>
    </>
  );

  return (
    <ModulePage title="Reviews" feature="marketing" description="Monitor and respond to client feedback.">
      <Feature flag="marketing">{body}</Feature>
    </ModulePage>
  );
}
