#!/usr/bin/env node
/**
 * Start/stop the Docker E2E stack (production Next.js in `web`, API + infra).
 * Avoids `next dev` on-demand compilation during Playwright runs.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const composeFile = path.join(repoRoot, "infra/docker/compose.yml");

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";
const apiURL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:18432";

const E2E_SERVICES = [
  "postgres",
  "redis",
  "mailhog",
  "minio",
  "migrate",
  "api",
  "web",
];

function runDocker(args, opts = {}) {
  const result = spawnSync("docker", ["compose", "-f", composeFile, ...args], {
    cwd: repoRoot,
    stdio: opts.stdio ?? "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  return result;
}

async function waitFor(url, label, attempts = 60, intervalMs = 5000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (res.ok || res.status < 500) {
        console.log(`✓ ${label} ready (${url})`);
        return;
      }
    } catch {
      // retry
    }
    console.log(`… waiting for ${label} (${i}/${attempts})`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`${label} did not become ready: ${url}`);
}

async function up() {
  const rebuild = process.argv.includes("--build") || process.env.E2E_REBUILD === "1";
  const upArgs = ["up", "-d", ...(rebuild ? ["--build"] : []), ...E2E_SERVICES];
  console.log(`Starting E2E stack (${rebuild ? "rebuild" : "cached images"})…`);
  console.log(`  Web (production): ${baseURL}`);
  console.log(`  API:              ${apiURL}`);
  runDocker(upArgs);

  await waitFor(`${apiURL}/health`, "API");
  await waitFor(`${baseURL}/login`, "Web");

  console.log("Seeding demo org…");
  runDocker(["run", "--rm", "api", "/app/seed"]);
  console.log("E2E stack is ready. Run: npm run test:e2e");
}

function down() {
  console.log("Stopping E2E stack…");
  runDocker(["down"]);
}

const cmd = process.argv[2] ?? "up";
if (cmd === "up") {
  await up();
} else if (cmd === "down") {
  down();
} else {
  console.error(`Usage: node scripts/e2e-stack.mjs [up|down] [--build]`);
  process.exit(1);
}
