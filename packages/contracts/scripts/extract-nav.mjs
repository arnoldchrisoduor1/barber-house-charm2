/**
 * Extract nav manifests from prototype AppLayout.tsx
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appLayoutPath = path.resolve(
  __dirname,
  "../../../../barber-house-charm/src/components/AppLayout.tsx"
);
const outDir = path.resolve(__dirname, "../domain/nav");

const src = fs.readFileSync(appLayoutPath, "utf8");

const NAV_NAMES = [
  "BARBER_NAV",
  "BEAUTY_NAV",
  "SPA_NAV",
  "NAIL_BAR_NAV",
  "CLINIC_NAV",
  "MOBILE_NAV",
  "THERAPY_NAV",
  "PRODUCTS_NAV",
];

const MODE_KEYS = {
  BARBER_NAV: "barber",
  BEAUTY_NAV: "beauty",
  SPA_NAV: "spa",
  NAIL_BAR_NAV: "nail_bar",
  CLINIC_NAV: "clinic",
  MOBILE_NAV: "mobile",
  THERAPY_NAV: "therapy",
  PRODUCTS_NAV: "products",
};

function parseNavBlock(block) {
  const items = [];
  const objRe = /\{[^{}]+\}/g;
  let om;
  while ((om = objRe.exec(block)) !== null) {
    const o = om[0];
    if (!o.includes("path:")) continue;
    const icon = o.match(/icon:\s*(\w+)/)?.[1];
    const label = o.match(/label:\s*"([^"]+)"/)?.[1];
    const p = o.match(/path:\s*"([^"]+)"/)?.[1];
    const section = o.match(/section:\s*"([^"]+)"/)?.[1];
    const feat = o.match(/requiredFeature:\s*"([^"]+)"/)?.[1];
    const rolesMatch = o.match(/roles:\s*\[([^\]]*)\]/);
    const roles = rolesMatch
      ? rolesMatch[1]
          .split(",")
          .map((r) => r.trim().replace(/"/g, ""))
          .filter(Boolean)
      : undefined;
    if (!icon || !label || !p || !section) continue;
    items.push({
      icon,
      label,
      path: p,
      section,
      ...(roles?.length ? { roles } : {}),
      ...(feat ? { requiredFeature: feat } : {}),
    });
  }
  return items;
}

fs.mkdirSync(outDir, { recursive: true });

for (const navName of NAV_NAMES) {
  const start = src.indexOf(`const ${navName}`);
  if (start === -1) continue;
  const eq = src.indexOf("=", start);
  const bracketStart = src.indexOf("[", eq);
  let depth = 0;
  let end = bracketStart;
  for (let i = bracketStart; i < src.length; i++) {
    if (src[i] === "[") depth++;
    if (src[i] === "]") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  const block = src.slice(bracketStart, end);
  const items = parseNavBlock(block);
  const mode = MODE_KEYS[navName];
  fs.writeFileSync(path.join(outDir, `${mode}.json`), JSON.stringify({ mode, items }, null, 2));
  console.log(`Wrote ${mode}.json (${items.length} items)`);
}

const soloPro = {
  mode: "solo_pro",
  items: [
    { icon: "LayoutDashboard", label: "My Dashboard", path: "/dashboard", section: "My Workspace", roles: ["ceo", "director", "senior_barber", "junior_barber"] },
    { icon: "Calendar", label: "My Bookings", path: "/bookings", section: "My Workspace", roles: ["ceo", "director", "senior_barber", "junior_barber"] },
    { icon: "CalendarDays", label: "My Schedule", path: "/schedule", section: "My Workspace", roles: ["ceo", "director", "senior_barber", "junior_barber"] },
    { icon: "Users", label: "My Clients", path: "/clients", section: "My Workspace", roles: ["ceo", "director", "senior_barber", "junior_barber"] },
    { icon: "Sparkles", label: "My Services", path: "/services", section: "My Workspace", roles: ["ceo", "director"] },
    { icon: "DollarSign", label: "My Earnings", path: "/my-earnings", section: "My Workspace", roles: ["ceo", "director", "senior_barber", "junior_barber"] },
    { icon: "ShoppingCart", label: "POS", path: "/pos", section: "Sales", roles: ["ceo", "director"], requiredFeature: "pos_payments" },
    { icon: "Crown", label: "Loyalty", path: "/loyalty", section: "Growth", roles: ["ceo", "director"] },
    { icon: "Settings", label: "Settings", path: "/settings", section: "System" },
    { icon: "HeadphonesIcon", label: "Support", path: "/support", section: "System" },
  ],
};
fs.writeFileSync(path.join(outDir, "solo_pro.json"), JSON.stringify(soloPro, null, 2));

fs.writeFileSync(
  path.join(outDir, "mixed.json"),
  JSON.stringify({ mode: "mixed", mergeStrategy: "union_dedupe_by_section_path", sourceModes: ["barber", "beauty", "spa", "nail_bar", "clinic", "mobile", "therapy", "products"] }, null, 2)
);
