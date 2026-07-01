"use client";

import { CrudModulePage } from "@/components/CrudModulePage";
import { reviewsConfig } from "@/lib/crud-configs";

export default function Page() {
  return <CrudModulePage config={reviewsConfig} />;
}
