"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Plus } from "lucide-react";
import { toast } from "sonner";

import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { createCustomerPhoto, fetchCustomerPhotos, fetchCustomers } from "@/lib/api/crm-advanced";

export default function ClientPhotosPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [photoType, setPhotoType] = useState<"before" | "after">("after");

  const customersQuery = useQuery({
    queryKey: ["org", orgId, "customers-photos"],
    queryFn: () => fetchCustomers(orgId),
    enabled: !!orgId,
  });

  const photosQuery = useQuery({
    queryKey: ["org", orgId, "customer-photos", customerId],
    queryFn: () => fetchCustomerPhotos(orgId, customerId),
    enabled: !!orgId && !!customerId,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createCustomerPhoto(orgId, customerId, {
        photo_type: photoType,
        service_name: serviceName,
        image_url: imageUrl,
      }),
    onSuccess: () => {
      setImageUrl("");
      setServiceName("");
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "customer-photos", customerId] });
      toast.success("Photo added");
    },
    onError: (e: Error) => toast.error(e.message || "Failed"),
  });

  return (
    <Feature flag="crm">
      <ModulePage title="Photo Timeline" description="Before/after visual history per client.">
        <div className="space-y-6" data-testid="client-photos-page">

        <Card className="glass">
          <CardContent className="grid gap-3 pt-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger data-testid="client-photo-customer">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {(customersQuery.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={photoType} onValueChange={(v) => setPhotoType(v as "before" | "after")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="before">Before</SelectItem>
                  <SelectItem value="after">After</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Service</Label>
              <Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Haircut" />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
                data-testid="client-photo-url"
              />
            </div>
            <Button
              className="md:col-span-2 gap-2"
              disabled={!customerId || !imageUrl}
              onClick={() => createMut.mutate()}
              data-testid="client-photo-add"
            >
              <Plus className="h-4 w-4" />
              Add photo
            </Button>
          </CardContent>
        </Card>

        {customerId ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(photosQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No photos yet.</p>
            ) : (
              (photosQuery.data ?? []).map((photo) => (
                <Card key={photo.id} className="glass overflow-hidden" data-testid="client-photo-row">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.imageUrl} alt={photo.serviceName ?? "Client photo"} className="h-40 w-full object-cover" />
                  <CardContent className="p-3 text-sm">
                    <p className="flex items-center gap-1 font-medium capitalize">
                      <Camera className="h-3 w-3" />
                      {photo.photoType}
                    </p>
                    <p className="text-muted-foreground">{photo.serviceName || "Service"}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : null}
        </div>
      </ModulePage>
    </Feature>
  );
}
