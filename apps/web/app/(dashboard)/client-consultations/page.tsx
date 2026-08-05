"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useEntityList } from "@/lib/api/crud";
import { createConsultation, fetchConsultations } from "@/lib/api/beauty-crm";
import { pickRowField } from "@/lib/record-fields";

type CustomerRow = Record<string, unknown>;

export default function ClientConsultationsPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const qc = useQueryClient();
  const { data: customers = [] } = useEntityList<CustomerRow>(orgId, "customers");
  const [customerId, setCustomerId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [summary, setSummary] = useState("");
  const [skinNotes, setSkinNotes] = useState("");
  const [productUsed, setProductUsed] = useState("");

  const listQuery = useQuery({
    queryKey: ["org", orgId, "consultations", customerId],
    queryFn: () => fetchConsultations(orgId, customerId),
    enabled: !!orgId && !!customerId,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createConsultation(orgId, customerId, {
        service_name: serviceName,
        treatment_summary: summary,
        skin_notes: skinNotes,
        product_used: productUsed,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "consultations", customerId] });
      setSummary("");
      setSkinNotes("");
      setProductUsed("");
      toast.success("Consultation note saved");
    },
    onError: (e: Error) => toast.error(e.message || "Failed"),
  });

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        id: String(c.id ?? c.ID ?? ""),
        name: String(pickRowField(c, "full_name") ?? "Client"),
      })),
    [customers],
  );

  return (
    <Feature flag="consultation_history">
      <ModulePage title="Consultation Notes" description="Treatment history and consultation notes per client.">
        <div data-testid="client-consultations-page" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-base">New consultation note</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger data-testid="consultation-customer">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {customerOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Service</Label>
                <Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Treatment summary</Label>
                <Textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  data-testid="consultation-summary"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Skin notes</Label>
                <Textarea value={skinNotes} onChange={(e) => setSkinNotes(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Products used</Label>
                <Input value={productUsed} onChange={(e) => setProductUsed(e.target.value)} />
              </div>
              <Button
                type="button"
                onClick={() => createMut.mutate()}
                disabled={!customerId || !summary.trim() || createMut.isPending}
                data-testid="consultation-save"
              >
                <Plus className="mr-2 h-4 w-4" />
                Save note
              </Button>
            </CardContent>
          </Card>

          {customerId ? (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(listQuery.data ?? []).map((row) => (
                  <div
                    key={row.id}
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                    data-testid="consultation-row"
                  >
                    <p className="font-medium">{row.service_name || "Treatment"}</p>
                    <p className="text-muted-foreground">{row.treatment_summary}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </ModulePage>
    </Feature>
  );
}
