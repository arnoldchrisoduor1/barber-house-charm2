"use client";

import { CrudModulePage } from "@/components/CrudModulePage";
import { galleryConfig } from "@/lib/crud-configs";

export default function Page() {
  return <CrudModulePage config={galleryConfig} />;
}
