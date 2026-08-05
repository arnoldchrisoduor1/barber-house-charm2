"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Tag, X } from "lucide-react";
import { toast } from "sonner";

import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { createCustomerTag, deleteCustomerTag, fetchCustomerTags } from "@/lib/api/crm-advanced";

const COLORS = ["bg-amber-500", "bg-green-500", "bg-purple-500", "bg-pink-500", "bg-blue-500", "bg-red-500"];

export default function ClientTagsPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const tagsQuery = useQuery({
    queryKey: ["org", orgId, "customer-tags"],
    queryFn: () => fetchCustomerTags(orgId),
    enabled: !!orgId,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createCustomerTag(orgId, name, COLORS[(tagsQuery.data?.length ?? 0) % COLORS.length]),
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "customer-tags"] });
      toast.success("Segment created");
    },
    onError: (e: Error) => toast.error(e.message || "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCustomerTag(orgId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org", orgId, "customer-tags"] }),
  });

  return (
    <Feature flag="crm">
      <ModulePage title="Tags & Segments" description="Group clients for marketing and operations.">
        <div data-testid="client-tags-page">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4" />
              Segments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="New segment name…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="client-tag-name"
              />
              <Button onClick={() => createMut.mutate()} disabled={!name.trim()} data-testid="client-tag-add">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(tagsQuery.data ?? []).map((tag) => (
                <Card key={tag.id} className="p-3" data-testid="client-tag-row">
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full px-2 py-0.5 text-xs text-white ${tag.color}`}>{tag.name}</span>
                    <button type="button" onClick={() => deleteMut.mutate(tag.id)} aria-label="Remove">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
        </div>
      </ModulePage>
    </Feature>
  );
}
