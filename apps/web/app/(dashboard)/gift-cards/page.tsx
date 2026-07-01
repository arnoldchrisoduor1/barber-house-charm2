"use client";

import { CrudModulePage } from "@/components/CrudModulePage";
import { giftCardsConfig } from "@/lib/crud-configs";

export default function Page() {
  return <CrudModulePage config={giftCardsConfig} />;
}
