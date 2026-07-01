#!/usr/bin/env node
/**
 * Generate e2e/generated/nav-routes.ts from nav manifests.
 * Run: node apps/web/scripts/generate-e2e-routes.mjs
 * Check: node apps/web/scripts/generate-e2e-routes.mjs --check
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const navDir = path.join(repoRoot, "packages/contracts/domain/nav");
const outDir = path.join(repoRoot, "apps/web/e2e/generated");
const outFile = path.join(outDir, "nav-routes.ts");

const PUBLIC_ROUTES = ["/", "/login", "/register", "/get-started", "/book/demo-salon"];
const ADMIN_ROUTES = [
  "/admin",
  "/admin/tenants",
  "/admin/subscriptions",
  "/admin/features",
  "/admin/payouts",
];
const EXTRA_DASHBOARD = ["/portal"];

function loadNavPaths() {
  const paths = new Set();
  for (const file of fs.readdirSync(navDir)) {
    if (!file.endsWith(".json") || file === "route-allowlist.json") continue;
    const manifest = JSON.parse(fs.readFileSync(path.join(navDir, file), "utf8"));
    for (const item of manifest.items ?? []) {
      if (item.path) paths.add(item.path);
    }
  }
  return [...paths].sort();
}

function generate() {
  const dashboard = loadNavPaths();
  return `/* AUTO-GENERATED — run: node apps/web/scripts/generate-e2e-routes.mjs */
export const PUBLIC_ROUTES = ${JSON.stringify(PUBLIC_ROUTES, null, 2)} as const;

export const DASHBOARD_NAV_ROUTES = ${JSON.stringify(dashboard, null, 2)} as const;

export const ADMIN_ROUTES = ${JSON.stringify(ADMIN_ROUTES, null, 2)} as const;

export const EXTRA_AUTHENTICATED_ROUTES = ${JSON.stringify(EXTRA_DASHBOARD, null, 2)} as const;
`;
}

const content = generate();
const check = process.argv.includes("--check");

if (check) {
  if (!fs.existsSync(outFile)) {
    console.error("Missing generated file. Run: node apps/web/scripts/generate-e2e-routes.mjs");
    process.exit(1);
  }
  const existing = fs.readFileSync(outFile, "utf8");
  if (existing !== content) {
    console.error("e2e/generated/nav-routes.ts is stale. Run: node apps/web/scripts/generate-e2e-routes.mjs");
    process.exit(1);
  }
  console.log("E2E nav routes check passed.");
  process.exit(0);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, content);
console.log(`Wrote ${outFile} (${loadNavPaths().length} dashboard routes).`);
