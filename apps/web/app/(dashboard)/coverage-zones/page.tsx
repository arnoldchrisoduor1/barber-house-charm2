"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CrudDialog } from "@/components/CrudDialog";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import {
  createCoverageZone,
  deleteCoverageZone,
  fetchCoverageZones,
  updateCoverageZone,
  type CoverageZone,
} from "@/lib/api/mobile";
import { formatKES } from "@/lib/format";

const emptyForm = {
  name: "",
  city: "",
  radius_km: "10",
  surcharge_kes: "500",
  is_active: true,
};

export default function CoverageZonesPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["org", orgId, "coverage-zones"],
    queryFn: () => fetchCoverageZones(orgId),
    enabled: !!orgId,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CoverageZone | null>(null);
  const [values, setValues] = useState(emptyForm);

  const zones = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  function openCreate() {
    setEditing(null);
    setValues(emptyForm);
    setOpen(true);
  }

  function openEdit(row: CoverageZone) {
    setEditing(row);
    setValues({
      name: row.name,
      city: row.city,
      radius_km: String(row.radius_km),
      surcharge_kes: String(row.surcharge_kes),
      is_active: row.is_active,
    });
    setOpen(true);
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const body = {
        name: values.name.trim(),
        city: values.city.trim(),
        radius_km: Number(values.radius_km) || 0,
        surcharge_kes: Number(values.surcharge_kes) || 0,
        is_active: values.is_active,
      };
      if (editing) {
        await updateCoverageZone(orgId, editing.id, body);
      } else {
        await createCoverageZone(orgId, body);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "coverage-zones"] });
      setOpen(false);
      toast.success(editing ? "Zone updated" : "Zone added");
    },
    onError: (e: Error) => toast.error(e.message || "Save failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCoverageZone(orgId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "coverage-zones"] });
      toast.success("Zone deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Delete failed"),
  });

  return (
    <ModulePage
      title="Coverage Zones"
      feature="coverage_zones"
      description="Service areas for home visits — radius and travel surcharge."
    >
      <div className="mb-4 flex justify-end" data-testid="coverage-zones-page">
        <Button type="button" onClick={openCreate} data-testid="coverage-zone-add">
          <Plus className="mr-2 h-4 w-4" />
          Add zone
        </Button>
      </div>

      {listQuery.isLoading ? (
        <p className="text-muted-foreground">Loading zones…</p>
      ) : zones.length === 0 ? (
        <p className="text-muted-foreground">No coverage zones yet. Add your first service area.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone) => (
            <Card key={zone.id} className="glass" data-testid={`coverage-zone-${zone.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-primary" />
                  {zone.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  {zone.city || "—"} · {zone.radius_km} km
                </p>
                <p>
                  Surcharge: <span className="font-medium">{formatKES(zone.surcharge_kes)}</span>
                </p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {zone.is_active ? "Active" : "Inactive"}
                </p>
                <div className="flex gap-2 pt-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => openEdit(zone)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => deleteMut.mutate(zone.id)}
                    disabled={deleteMut.isPending}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CrudDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit zone" : "Add zone"}
        onSubmit={() => saveMut.mutate()}
        loading={saveMut.isPending}
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="zone-name">Name</Label>
            <Input
              id="zone-name"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zone-city">City</Label>
            <Input
              id="zone-city"
              value={values.city}
              onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="zone-radius">Radius (km)</Label>
              <Input
                id="zone-radius"
                type="number"
                value={values.radius_km}
                onChange={(e) => setValues((v) => ({ ...v, radius_km: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zone-surcharge">Surcharge (KES)</Label>
              <Input
                id="zone-surcharge"
                type="number"
                value={values.surcharge_kes}
                onChange={(e) => setValues((v) => ({ ...v, surcharge_kes: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
            <Label htmlFor="zone-active">Active</Label>
            <Switch
              id="zone-active"
              checked={values.is_active}
              onCheckedChange={(checked) => setValues((v) => ({ ...v, is_active: checked }))}
            />
          </div>
        </div>
      </CrudDialog>
    </ModulePage>
  );
}
