"use client";

import { CrudModulePage } from "@/components/CrudModulePage";
import { inventoryConfig } from "@/lib/crud-configs";

export default function Page() {
  return <CrudModulePage config={inventoryConfig} />;
}
