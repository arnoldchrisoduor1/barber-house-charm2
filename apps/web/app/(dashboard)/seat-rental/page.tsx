"use client";

import { CrudModulePage } from "@/components/CrudModulePage";
import { seatRentalConfig } from "@/lib/crud-configs";

export default function Page() {
  return <CrudModulePage config={seatRentalConfig} />;
}
