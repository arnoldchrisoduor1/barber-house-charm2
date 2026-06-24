import type { BusinessMode } from "@haus/contracts";
import barberNav from "@haus/contracts/domain/nav/barber.json";
import beautyNav from "@haus/contracts/domain/nav/beauty.json";
import spaNav from "@haus/contracts/domain/nav/spa.json";
import nailBarNav from "@haus/contracts/domain/nav/nail_bar.json";
import clinicNav from "@haus/contracts/domain/nav/clinic.json";
import mobileNav from "@haus/contracts/domain/nav/mobile.json";
import therapyNav from "@haus/contracts/domain/nav/therapy.json";
import soloProNav from "@haus/contracts/domain/nav/solo_pro.json";
import productsNav from "@haus/contracts/domain/nav/products.json";
import mixedNav from "@haus/contracts/domain/nav/mixed.json";

export interface NavItem {
  icon: string;
  label: string;
  path: string;
  section: string;
  roles?: string[];
  requiredFeature?: string;
}

export interface NavManifest {
  mode: string;
  items: NavItem[];
}

const modeNavManifests: Record<Exclude<BusinessMode, "mixed">, NavManifest> = {
  barber: barberNav as NavManifest,
  beauty: beautyNav as NavManifest,
  spa: spaNav as NavManifest,
  nail_bar: nailBarNav as NavManifest,
  clinic: clinicNav as NavManifest,
  mobile: mobileNav as NavManifest,
  therapy: therapyNav as NavManifest,
  solo_pro: soloProNav as NavManifest,
  products: productsNav as NavManifest,
};

function mergeMixedNav(): NavManifest {
  const sourceModes = ((mixedNav as { sourceModes?: BusinessMode[] }).sourceModes ?? [
    "barber",
    "beauty",
    "spa",
  ]).filter((mode): mode is Exclude<BusinessMode, "mixed"> => mode !== "mixed");

  const seen = new Set<string>();
  const items: NavItem[] = [];

  for (const mode of sourceModes) {
    const manifest = modeNavManifests[mode];
    if (!manifest) continue;
    for (const item of manifest.items) {
      const key = `${item.section}::${item.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }
  }

  return { mode: "mixed", items };
}

export const navByMode: Record<BusinessMode | "mixed", NavManifest> = {
  ...modeNavManifests,
  mixed: mergeMixedNav(),
};

export function resolveNavMode(businessType?: string | null): BusinessMode | "mixed" {
  if (!businessType || businessType === "both") return "mixed";
  if (businessType in navByMode) return businessType as BusinessMode;
  return "barber";
}
