"use client";

import { useMemo, useState } from "react";
import { Mail, Megaphone, MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";

import { CrudDialog } from "@/components/CrudDialog";
import { DataTable } from "@/components/DataTable";
import { EntityForm } from "@/components/EntityForm";
import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useEntityCreate, useEntityDelete, useEntityList, useEntityUpdate } from "@/lib/api/crud";
import { marketingCampaignsConfig } from "@/lib/crud-configs";
import { pickRowField } from "@/lib/record-fields";
import { cn } from "@/lib/utils";

type CampaignRow = Record<string, unknown>;

function rowId(row: CampaignRow): string {
  return String(row.id ?? row.ID ?? "");
}

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  sms: MessageCircle,
  whatsapp: MessageCircle,
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  scheduled: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  sent: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  paused: "bg-amber-500/20 text-amber-400 border-amber-500/40",
};

export default function MarketingPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const { data: campaigns = [], isLoading, error } = useEntityList<CampaignRow>(orgId, "marketing-campaigns");
  const createMut = useEntityCreate(orgId, "marketing-campaigns");
  const updateMut = useEntityUpdate(orgId, "marketing-campaigns");
  const deleteMut = useEntityDelete(orgId, "marketing-campaigns");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CampaignRow | null>(null);
  const initialValues = useMemo(() => {
    const base: Record<string, string> = {};
    for (const f of marketingCampaignsConfig.fields) base[f.name] = "";
    return base;
  }, []);
  const [values, setValues] = useState<Record<string, string>>(initialValues);

  function openCreate() {
    setEditing(null);
    setValues(initialValues);
    setOpen(true);
  }

  function openEdit(row: CampaignRow) {
    setEditing(row);
    const next = { ...initialValues };
    for (const f of marketingCampaignsConfig.fields) {
      next[f.name] = String(pickRowField(row, f.name) ?? "");
    }
    setValues(next);
    setOpen(true);
  }

  async function save() {
    const body = { ...values };
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: rowId(editing), body });
        toast.success("Campaign updated");
      } else {
        await createMut.mutateAsync(body);
        toast.success("Campaign created");
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function remove(row: CampaignRow) {
    try {
      await deleteMut.mutateAsync(rowId(row));
      toast.success("Campaign deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const body = (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Overview of your outreach campaigns.</p>
        <Button onClick={openCreate} disabled={!orgId} className="gap-2">
          <Plus className="h-4 w-4" />
          New campaign
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading campaigns…</p>}
      {error && <p className="text-destructive">Failed to load campaigns.</p>}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {campaigns.map((row) => {
          const name = String(pickRowField(row, "name") ?? "Campaign");
          const channel = String(pickRowField(row, "channel") ?? "email");
          const status = String(pickRowField(row, "status") ?? "draft");
          const subject = String(
            pickRowField(row, "subject") ?? pickRowField(row, "message") ?? pickRowField(row, "body") ?? "",
          );
          const Icon = CHANNEL_ICONS[channel] ?? Megaphone;

          return (
            <Card
              key={rowId(row)}
              className="glass cursor-pointer transition hover:-translate-y-0.5 hover:shadow-glow"
              onClick={() => openEdit(row)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
                      STATUS_COLORS[status.toLowerCase()] ?? STATUS_COLORS.draft,
                    )}
                  >
                    {status}
                  </span>
                </div>
                <CardTitle className="text-base">{name}</CardTitle>
                <p className="text-xs capitalize text-muted-foreground">{channel}</p>
              </CardHeader>
              {subject && (
                <CardContent>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{subject}</p>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {!isLoading && campaigns.length === 0 && (
        <p className="mb-8 py-8 text-center text-muted-foreground">No campaigns yet.</p>
      )}

      <Card className="glass">
        <CardHeader>
          <CardTitle>All campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={marketingCampaignsConfig.columns}
            rows={campaigns}
            emptyMessage="No campaigns yet."
            rowKey={(row) => rowId(row)}
            onEdit={openEdit}
            onDelete={remove}
          />
        </CardContent>
      </Card>

      <CrudDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit campaign" : "New campaign"}
        onSubmit={save}
        loading={createMut.isPending || updateMut.isPending}
      >
        <EntityForm
          fields={marketingCampaignsConfig.fields}
          values={values}
          onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
        />
      </CrudDialog>
    </>
  );

  return (
    <ModulePage title="Marketing" feature="marketing" description="Plan and track outreach campaigns.">
      <Feature flag="marketing">{body}</Feature>
    </ModulePage>
  );
}
