"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Armchair, Plus } from "lucide-react";
import { toast } from "sonner";

import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { Badge } from "@/components/ui/badge";
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
import { createResource, deleteResource, fetchResources, updateResource } from "@/lib/api/spa";

const STATUS_COLORS: Record<string, string> = {
  available: "bg-emerald-500/20 text-emerald-300",
  occupied: "bg-amber-500/20 text-amber-300",
  maintenance: "bg-red-500/20 text-red-300",
  cleaning: "bg-blue-500/20 text-blue-300",
};

export default function ResourcesPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [resourceType, setResourceType] = useState("room");
  const [capacity, setCapacity] = useState("1");
  const [status, setStatus] = useState("available");
  const [notes, setNotes] = useState("");

  const listQuery = useQuery({
    queryKey: ["org", orgId, "resources"],
    queryFn: () => fetchResources(orgId),
    enabled: !!orgId,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createResource(orgId, {
        name,
        resource_type: resourceType,
        capacity: Number(capacity) || 1,
        status,
        notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "resources"] });
      setName("");
      setNotes("");
      toast.success("Resource created");
    },
    onError: (e: Error) => toast.error(e.message || "Failed"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, next }: { id: string; next: string }) => updateResource(orgId, id, { status: next }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "resources"] });
      toast.success("Status updated");
    },
    onError: (e: Error) => toast.error(e.message || "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteResource(orgId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "resources"] });
      toast.success("Resource removed");
    },
    onError: (e: Error) => toast.error(e.message || "Failed"),
  });

  const resources = listQuery.data ?? [];
  const byType = useMemo(() => {
    const map = new Map<string, typeof resources>();
    for (const r of resources) {
      const t = r.resource_type || "room";
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(r);
    }
    return map;
  }, [resources]);

  return (
    <Feature flag="resource_booking">
      <ModulePage title="Treatment Rooms" description="Manage rooms, beds, and spa facilities.">
        <div data-testid="resources-page" className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add resource
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Treatment Room 4" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={resourceType} onValueChange={setResourceType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="room">Room</SelectItem>
                    <SelectItem value="bed">Bed</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="facility">Facility</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
              <Button
                className="sm:col-span-2 bg-gradient-gold text-primary-foreground"
                disabled={!name || createMut.isPending}
                onClick={() => createMut.mutate()}
              >
                Create resource
              </Button>
            </CardContent>
          </Card>

          {listQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading resources…</p>
          ) : resources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No resources yet. Add treatment rooms above.</p>
          ) : (
            Array.from(byType.entries()).map(([type, rows]) => (
              <div key={type} className="space-y-3">
                <h2 className="label-eyebrow capitalize">{type.replace(/_/g, " ")}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {rows.map((r) => (
                    <Card key={r.id} className="glass" data-testid={`resource-card-${r.id}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Armchair className="h-4 w-4 text-primary" />
                          {r.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge className={STATUS_COLORS[r.status] ?? ""}>{r.status}</Badge>
                          <span className="text-muted-foreground">Cap. {r.capacity}</span>
                        </div>
                        {r.notes ? <p className="text-muted-foreground">{r.notes}</p> : null}
                        <div className="flex flex-wrap gap-2">
                          {r.status !== "available" ? (
                            <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: r.id, next: "available" })}>
                              Mark available
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: r.id, next: "cleaning" })}>
                              Mark cleaning
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMut.mutate(r.id)}>
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ModulePage>
    </Feature>
  );
}
