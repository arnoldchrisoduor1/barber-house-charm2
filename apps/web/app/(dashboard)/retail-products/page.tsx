"use client";

import { useMemo, useState } from "react";
import { Package, Plus } from "lucide-react";
import { toast } from "sonner";

import { CrudDialog } from "@/components/CrudDialog";
import { EntityForm } from "@/components/EntityForm";
import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { SearchFilter } from "@/components/SearchFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useEntityCreate, useEntityDelete, useEntityList, useEntityUpdate } from "@/lib/api/crud";
import { retailConfig } from "@/lib/crud-configs";
import { formatKES } from "@/lib/format";
import { pickRowField } from "@/lib/record-fields";
import { cn } from "@/lib/utils";

type ProductRow = Record<string, unknown>;

function rowId(row: ProductRow): string {
  return String(row.id ?? row.ID ?? "");
}

export default function RetailProductsPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const { apiParams } = useBranchFilter();
  const { data: products = [], isLoading, error } = useEntityList<ProductRow>(
    orgId,
    "retail-products",
    apiParams,
  );
  const createMut = useEntityCreate(orgId, "retail-products");
  const updateMut = useEntityUpdate(orgId, "retail-products");
  const deleteMut = useEntityDelete(orgId, "retail-products");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [values, setValues] = useState({
    name: "",
    category: "",
    price_kes: "",
    quantity: "",
    description: "",
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const row of products) {
      const cat = String(pickRowField(row, "category") ?? "").trim();
      if (cat) set.add(cat);
    }
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((row) => {
      const cat = String(pickRowField(row, "category") ?? "");
      if (categoryFilter !== "all" && cat !== categoryFilter) return false;
      if (!q) return true;
      const name = String(pickRowField(row, "name") ?? "").toLowerCase();
      const category = cat.toLowerCase();
      return name.includes(q) || category.includes(q);
    });
  }, [products, search, categoryFilter]);

  function openCreate() {
    setEditing(null);
    setValues({ name: "", category: "", price_kes: "", quantity: "", description: "" });
    setOpen(true);
  }

  function openEdit(row: ProductRow) {
    setEditing(row);
    setValues({
      name: String(pickRowField(row, "name") ?? ""),
      category: String(pickRowField(row, "category") ?? ""),
      price_kes: String(pickRowField(row, "price_kes") ?? ""),
      quantity: String(pickRowField(row, "quantity") ?? ""),
      description: String(pickRowField(row, "description") ?? ""),
    });
    setOpen(true);
  }

  async function save() {
    const body = retailConfig.mapFormToBody!(values);
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: rowId(editing), body });
        toast.success("Product updated");
      } else {
        await createMut.mutateAsync(body);
        toast.success("Product added");
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function remove(row: ProductRow) {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteMut.mutateAsync(rowId(row));
      toast.success("Product deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const body = (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Search products…"
            className="w-full max-w-xs"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                categoryFilter === "all"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50",
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                  categoryFilter === cat
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={openCreate} disabled={!orgId} className="gap-2">
          <Plus className="h-4 w-4" />
          Add product
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading products…</p>}
      {error && <p className="text-destructive">Failed to load products.</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((row) => {
          const name = String(pickRowField(row, "name") ?? "Product");
          const category = String(pickRowField(row, "category") ?? "General");
          const price = Number(pickRowField(row, "price_kes") ?? 0);
          const qty = Number(pickRowField(row, "quantity") ?? 0);

          return (
            <Card key={rowId(row)} className="glass group relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {category}
                  </span>
                </div>
                <CardTitle className="text-base">{name}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-primary">{formatKES(price)}</p>
                  <p className="text-xs text-muted-foreground">{qty} in stock</p>
                </div>
                <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => remove(row)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isLoading && filtered.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">No products found.</p>
      )}

      <CrudDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit product" : "Add product"}
        onSubmit={save}
        loading={createMut.isPending || updateMut.isPending}
      >
        <EntityForm
          fields={retailConfig.fields}
          values={values}
          onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
        />
      </CrudDialog>
    </>
  );

  return (
    <ModulePage
      title="Retail Products"
      feature="inventory_tracking"
      description="Search and manage retail inventory."
    >
      <Feature flag="inventory_tracking">{body}</Feature>
    </ModulePage>
  );
}
