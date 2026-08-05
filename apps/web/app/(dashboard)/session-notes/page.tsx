"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Feature } from "@/components/Feature";
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
import { useEntityList } from "@/lib/api/crud";
import { createSessionNote, fetchSessionNotes } from "@/lib/api/spa";
import { pickRowField } from "@/lib/record-fields";

type CustomerRow = Record<string, unknown>;

export default function SessionNotesPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const qc = useQueryClient();
  const { data: customers = [] } = useEntityList<CustomerRow>(orgId, "customers");

  const [customerId, setCustomerId] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [focusArea, setFocusArea] = useState("");
  const [pressureLevel, setPressureLevel] = useState("");
  const [oilsUsed, setOilsUsed] = useState("");
  const [contraindications, setContraindications] = useState("");
  const [nextVisitNotes, setNextVisitNotes] = useState("");

  const listQuery = useQuery({
    queryKey: ["org", orgId, "session-notes", customerId],
    queryFn: () => fetchSessionNotes(orgId, customerId || undefined),
    enabled: !!orgId,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createSessionNote(orgId, {
        customer_id: customerId,
        session_date: sessionDate,
        title,
        content,
        focus_area: focusArea,
        pressure_level: pressureLevel,
        oils_used: oilsUsed,
        contraindications,
        next_visit_notes: nextVisitNotes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "session-notes"] });
      setTitle("");
      setContent("");
      setFocusArea("");
      setPressureLevel("");
      setOilsUsed("");
      setContraindications("");
      setNextVisitNotes("");
      toast.success("Session note saved");
    },
    onError: (e: Error) => toast.error(e.message || "Failed"),
  });

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        id: String(c.id ?? c.ID ?? ""),
        name: String(pickRowField(c, "full_name") ?? "Guest"),
      })),
    [customers],
  );

  const notes = listQuery.data ?? [];
  const filtered = customerId ? notes.filter((n) => n.customer_id === customerId) : notes;

  return (
    <Feature flag="therapy_notes">
      <ModulePage title="Session Notes" description="Treatment session notes per guest.">
        <div data-testid="session-notes-page" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-base">New session note</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Guest</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Select guest" /></SelectTrigger>
                  <SelectContent>
                    {customerOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Session date</Label>
                <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Swedish massage follow-up" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Session summary</Label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Focus area</Label>
                <Input value={focusArea} onChange={(e) => setFocusArea(e.target.value)} placeholder="Upper back, shoulders" />
              </div>
              <div className="space-y-2">
                <Label>Pressure level</Label>
                <Input value={pressureLevel} onChange={(e) => setPressureLevel(e.target.value)} placeholder="Medium-firm" />
              </div>
              <div className="space-y-2">
                <Label>Oils / products used</Label>
                <Input value={oilsUsed} onChange={(e) => setOilsUsed(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Contraindications noted</Label>
                <Input value={contraindications} onChange={(e) => setContraindications(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Next visit notes</Label>
                <Textarea value={nextVisitNotes} onChange={(e) => setNextVisitNotes(e.target.value)} rows={2} />
              </div>
              <Button
                className="sm:col-span-2 bg-gradient-gold text-primary-foreground"
                disabled={!customerId || !sessionDate || createMut.isPending}
                onClick={() => createMut.mutate()}
              >
                <Plus className="mr-2 h-4 w-4" /> Save note
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {listQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading notes…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No session notes yet.</p>
            ) : (
              filtered.map((n) => (
                <Card key={n.id} className="glass" data-testid={`session-note-${n.id}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{n.title || "Session note"}</CardTitle>
                    <p className="text-xs text-muted-foreground">{n.session_date}</p>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1 text-muted-foreground">
                    {n.content ? <p>{n.content}</p> : null}
                    {n.focus_area ? <p><span className="text-foreground">Focus:</span> {n.focus_area}</p> : null}
                    {n.pressure_level ? <p><span className="text-foreground">Pressure:</span> {n.pressure_level}</p> : null}
                    {n.next_visit_notes ? <p><span className="text-foreground">Next visit:</span> {n.next_visit_notes}</p> : null}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </ModulePage>
    </Feature>
  );
}
