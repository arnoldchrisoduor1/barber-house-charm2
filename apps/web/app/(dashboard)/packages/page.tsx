"use client";

import { CrudModulePage, type CrudModuleConfig } from "@/components/CrudModulePage";
import { useBusinessCategory } from "@/hooks/useBusinessCategory";
import { packagesConfig } from "@/lib/crud-configs";

const kitsConfig: CrudModuleConfig = {
  title: "Bundles & Kits",
  feature: "marketing",
  resource: "service-packages",
  fields: [
    { name: "name", label: "Kit name", required: true },
    {
      name: "package_type",
      label: "Type",
      type: "select",
      options: [
        { value: "kit", label: "Product kit" },
        { value: "bundle", label: "Bundle" },
      ],
    },
    { name: "price_kes", label: "Price (KES)", type: "number" },
    { name: "description", label: "Contents / description", type: "textarea" },
  ],
  columns: [
    { key: "name", header: "Kit" },
    { key: "package_type", header: "Type" },
    { key: "price_kes", header: "Price" },
  ],
  mapFormToBody: (v) => ({
    name: v.name,
    package_type: v.package_type || "kit",
    price_kes: Number(v.price_kes) || 0,
    total_sessions: 1,
    valid_days: 365,
    description: v.description,
    is_active: true,
  }),
};

export default function Page() {
  const { mode } = useBusinessCategory();
  if (mode === "products") return <CrudModulePage config={kitsConfig} />;
  if (mode === "therapy") {
    return <CrudModulePage config={{ ...packagesConfig, title: "Session Packages" }} />;
  }
  return <CrudModulePage config={packagesConfig} />;
}
