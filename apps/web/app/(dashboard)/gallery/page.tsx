"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { CrudModulePage } from "@/components/CrudModulePage";
import { Button } from "@/components/ui/button";
import { galleryConfig } from "@/lib/crud-configs";
import { useAuth } from "@/hooks/useAuth";
import { useEntityList } from "@/lib/api/crud";
import { pickRowField } from "@/lib/record-fields";

type GalleryRow = Record<string, unknown>;

export default function GalleryPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { data: items = [] } = useEntityList<GalleryRow>(orgId, "gallery");

  async function uploadFile(file: File) {
    if (!orgId || !uploadId) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/v1/organizations/${orgId}/gallery/${uploadId}/image`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(String(err.detail ?? err.title ?? res.statusText));
      }
      await qc.invalidateQueries({ queryKey: ["org", orgId, "gallery"] });
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <CrudModulePage config={galleryConfig} />
      <div className="glass rounded-lg border border-border p-4">
        <p className="mb-3 text-sm text-muted-foreground">Upload before/after photo to an existing gallery row.</p>
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
            Upload image
          </Button>
        </div>
      </div>
    </div>
  );
}
