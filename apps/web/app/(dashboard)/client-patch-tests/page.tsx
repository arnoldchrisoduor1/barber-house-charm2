"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus } from "lucide-react";
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
import { createPatchTest, fetchPatchTests, type PatchTest } from "@/lib/api/beauty-crm";
import { pickRowField } from "@/lib/record-fields";

type CustomerRow = Record<string, unknown>;

function isExpired(test: PatchTest): boolean {
  if (!test.expires_at) return false;
  return new Date(test.expires_at).getTime() < Date.now();
}

export default function ClientPatchTestsPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const qc = useQueryClient();
  const { data: customers = [] } = useEntityList<CustomerRow>(orgId, "customers");
  const [customerId, setCustomerId] = useState("");
  const [testType, setTestType] = useState("colour");
  const [result, setResult] = useState("pass");
  const [notes, setNotes] = useState("");

  const testsQuery = useQuery({
    queryKey: ["org", orgId, "patch-tests", customerId],
    queryFn: () => fetchPatchTests(orgId, customerId),
    enabled: !!orgId && !!customerId,
  });

  const createMut = useMutation({
    mutationFn: () => createPatchTest(orgId, customerId, { test_type: testType, result, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "patch-tests", customerId] });
      setNotes("");
      toast.success("Patch test recorded");
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
    <Feature flag="clinical">
      <ModulePage title="Patch Tests" description="Track colour and chemical patch tests per client.">
        <div data-testid="client-patch-tests-page" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-base">Record patch test</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger data-testid="patch-test-customer">
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
                <Label>Test type</Label>
                <Select value={testType} onValueChange={setTestType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="colour">Colour</SelectItem>
                    <SelectItem value="relaxer">Relaxer</SelectItem>
                    <SelectItem value="wax">Wax</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Result</Label>
                <Select value={result} onValueChange={setResult}>
                  <SelectTrigger data-testid="patch-test-result">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <Button
                type="button"
                onClick={() => createMut.mutate()}
                disabled={!customerId || createMut.isPending}
                data-testid="patch-test-save"
              >
                <Plus className="mr-2 h-4 w-4" />
                Save test
              </Button>
            </CardContent>
          </Card>

          {customerId ? (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">Test history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(testsQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No patch tests yet.</p>
                ) : (
                  (testsQuery.data ?? []).map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                      data-testid="patch-test-row"
                    >
                      <span>
                        {t.test_type} — {t.result} ({new Date(t.performed_at).toLocaleDateString()})
                      </span>
                      {isExpired(t) ? (
                        <span
                          className="flex items-center gap-1 text-amber-500"
                          data-testid="patch-test-expired"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Expired
                        </span>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </ModulePage>
    </Feature>
  );
}
