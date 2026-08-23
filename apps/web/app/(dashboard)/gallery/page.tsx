"use client";

import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { CrudModulePage, type CrudModuleConfig } from "@/components/CrudModulePage";
import { Button } from "@/components/ui/button";
import { galleryConfig } from "@/lib/crud-configs";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessCategory } from "@/hooks/useBusinessCategory";
import { useEntityList } from "@/lib/api/crud";
import { pickRowField } from "@/lib/record-fields";

type GalleryRow = Record<string, unknown>;
type UploadSlot = "before" | "after";

function galleryTitle(mode: string): string {
  if (mode === "nail_bar") return "Nail Art Gallery";
  if (mode === "clinic") return "Before & After";
  if (mode === "beauty") return "Before & After Gallery";
  if (mode === "spa") return "Ambience Gallery";
  return "Gallery";
}

export default function GalleryPage() {
  const { activeOrg } = useAuth();
  const { mode } = useBusinessCategory();
  const orgId = activeOrg?.id;
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [uploadSlot, setUploadSlot] = useState<UploadSlot>("before");
  const [uploading, setUploading] = useState(false);
  const { data: items = [] } = useEntityList<GalleryRow>(orgId, "gallery");
  const pairingModes = mode === "nail_bar" || mode === "clinic" || mode === "beauty";

  const config: CrudModuleConfig = useMemo(
    () => ({
      ...galleryConfig,
      title: galleryTitle(mode),
      fields: [
        { name: "title", label: "Title", required: true },
        { name: "description", label: "Description", type: "textarea" },
        { name: "staff_id", label: "Staff ID" },
        {
          name: "image_url",
          label: pairingModes ? "Before image URL" : "Image URL (or upload after save)",
        },
        ...(pairingModes
          ? [{ name: "after_image_url", label: "After image URL (or upload after save)" }]
          : []),
        { name: "category", label: "Category" },
      ],
      columns: pairingModes
        ? [
            { key: "title", header: "Title" },
            { key: "image_url", header: "Before" },
            { key: "after_image_url", header: "After" },
          ]
        : galleryConfig.columns,
      mapFormToBody: (v) => ({
        title: v.title,
        description: v.description,
        staff_id: v.staff_id || undefined,
        image_url: v.image_url || "https://placehold.co/600x400?text=Before",
        after_image_url: pairingModes ? v.after_image_url || undefined : undefined,
        category: v.category,
      }),
    }),
    [mode, pairingModes],
  );

  const selected = items.find((row) => String(pickRowField(row, "id") ?? "") === uploadId);
  const beforeUrl = selected ? String(pickRowField(selected, "image_url") ?? "") : "";
  const afterUrl = selected ? String(pickRowField(selected, "after_image_url") ?? "") : "";

  async function uploadFile(file: File) {
    if (!orgId || !uploadId) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const slot = pairingModes ? uploadSlot : "before";
      const res = await fetch(
        `/api/v1/organizations/${orgId}/gallery/${uploadId}/image?slot=${slot}`,
        {
          method: "POST",
          body: form,
          credentials: "include",
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(String(err.detail ?? err.title ?? res.statusText));
      }
      await qc.invalidateQueries({ queryKey: ["org", orgId, "gallery"] });
      toast.success(slot === "after" ? "After image uploaded" : "Before image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <CrudModulePage config={config} />
      <div className="glass rounded-lg border border-border p-4" data-testid="gallery-upload-panel">
        <p className="mb-3 text-sm text-muted-foreground">
          {pairingModes
            ? "Upload before and after photos to an existing gallery row."
            : "Upload a photo to an existing gallery row."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={uploadId ?? ""}
            onChange={(e) => setUploadId(e.target.value || null)}
            data-testid="gallery-upload-select"
          >
            <option value="">Select gallery item…</option>
            {items.map((row) => {
              const id = String(pickRowField(row, "id") ?? "");
              const title = String(pickRowField(row, "title") ?? id);
              return (
                <option key={id} value={id}>
                  {title}
                </option>
              );
            })}
          </select>
          {pairingModes ? (
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={uploadSlot}
              onChange={(e) => setUploadSlot(e.target.value as UploadSlot)}
              data-testid="gallery-upload-slot"
            >
              <option value="before">Before</option>
              <option value="after">After</option>
            </select>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            className="gap-2"
            data-testid="gallery-upload-btn"
            disabled={!uploadId || uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {pairingModes ? `Upload ${uploadSlot}` : "Upload image"}
          </Button>
        </div>
        {pairingModes && uploadId ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2" data-testid="gallery-pair-preview">
            <div className="rounded-md border border-border p-2">
              <p className="label-eyebrow mb-2">Before</p>
              {beforeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={beforeUrl} alt="Before" className="max-h-40 w-full object-cover rounded" />
              ) : (
                <p className="text-sm text-muted-foreground">No before image yet.</p>
              )}
            </div>
            <div className="rounded-md border border-border p-2">
              <p className="label-eyebrow mb-2">After</p>
              {afterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={afterUrl} alt="After" className="max-h-40 w-full object-cover rounded" />
              ) : (
                <p className="text-sm text-muted-foreground">No after image yet.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
