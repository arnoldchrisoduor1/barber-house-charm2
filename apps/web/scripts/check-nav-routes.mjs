#!/usr/bin/env node
/**
 * Verify every nav manifest path resolves to a Next.js App Router page.
 * Reads packages/contracts/domain/nav/*.json and checks apps/web/app route groups.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const navDir = path.join(repoRoot, "packages/contracts/domain/nav");
const appDir = path.join(repoRoot, "apps/web/app");
const allowlistPath = path.join(navDir, "route-allowlist.json");

const ROUTE_GROUP_DIRS = ["(dashboard)", "(admin)", "(auth)", "(portal)", "(public)", "(marketing)"];

function walkPages(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkPages(full, acc);
      continue;
    }
    if (entry.name === "page.tsx") {
      acc.push(full.replace(/\\/g, "/"));
    }
  }
  return acc;
}

function pageRoutePaths() {
  const pages = walkPages(appDir);
  const routes = new Set();
  for (const page of pages) {
    const match = page.match(/\/\([^)]+\)\/(.+)\/page\.tsx$/);
    if (match) {
      routes.add("/" + match[1]);
    }
  }
  return routes;
}

function loadAllowlist() {
  if (!fs.existsSync(allowlistPath)) {
    return new Set();
  }
  const data = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
  return new Set(Array.isArray(data) ? data : []);
}

function loadNavPaths() {
  const paths = new Set();
  for (const file of fs.readdirSync(navDir)) {
    if (!file.endsWith(".json") || file === "route-allowlist.json") {
      continue;
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(navDir, file), "utf8"));
    for (const item of manifest.items ?? []) {
      if (item.path) {
        paths.add(item.path);
      }
    }
  }
  return paths;
}

function routeExists(navPath, existingRoutes) {
  if (existingRoutes.has(navPath)) {
    return true;
  }
  for (const group of ROUTE_GROUP_DIRS) {
    const candidate = path.join(appDir, group, navPath.slice(1), "page.tsx");
    if (fs.existsSync(candidate)) {
      return true;
    }
  }
  return false;
}

const existingRoutes = pageRoutePaths();
const navPaths = loadNavPaths();
const allowlist = loadAllowlist();
const orphans = [...navPaths]
  .filter((navPath) => !allowlist.has(navPath) && !routeExists(navPath, existingRoutes))
  .sort();

if (orphans.length > 0) {
  console.error("Nav orphan routes (no matching page.tsx):");
  for (const orphan of orphans) {
    console.error(`  - ${orphan}`);
  }
  process.exit(1);
}

console.log(`Nav route check passed (${navPaths.size} paths, ${existingRoutes.size} pages).`);
