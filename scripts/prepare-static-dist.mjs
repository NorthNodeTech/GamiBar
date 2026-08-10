/**
 * Flatten TanStack SPA output for static hosts (Render, Netlify, etc.).
 * After `vite build`: dist/client + dist/server → single publishable dist/
 *
 * Materializes index.html under every static route so deep links and refresh
 * work even when the host has not applied a SPA rewrite rule yet.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extractStaticRoutes, routePathToDistDir } from "./extract-static-routes.mjs";

const root = process.cwd();
const dist = join(root, "dist");
const client = join(dist, "client");
const server = join(dist, "server");

if (!existsSync(client)) {
  console.error("[prepare-static-dist] Missing dist/client — run vite build first.");
  process.exit(1);
}

mkdirSync(dist, { recursive: true });

// Vite only empties dist/ at build start; leftover route shells from a prior
// prepare-static-dist run can otherwise survive across builds.
for (const name of readdirSync(dist)) {
  if (name === "client" || name === "server") continue;
  rmSync(join(dist, name), { recursive: true, force: true });
}

for (const name of readdirSync(client)) {
  const from = join(client, name);
  const to = join(dist, name);
  if (existsSync(to)) {
    rmSync(to, { recursive: true, force: true });
  }
  renameSync(from, to);
}

rmSync(client, { recursive: true, force: true });
if (existsSync(server)) {
  rmSync(server, { recursive: true, force: true });
}

const indexHtml = join(dist, "index.html");
if (!existsSync(indexHtml)) {
  console.error("[prepare-static-dist] dist/index.html was not produced.");
  process.exit(1);
}

// Netlify-style; some CDNs honor this. Render still needs Dashboard/Blueprint rewrites
// for dynamic paths like /play/:roomId and /author/room/:roomId.
writeFileSync(join(dist, "_redirects"), "/*    /index.html   200\n");

// Some hosts serve 404.html for unknown paths — load the SPA shell.
copyFileSync(indexHtml, join(dist, "404.html"));

const staticRoutes = extractStaticRoutes(root);
const shellDirs = new Set();

for (const routePath of staticRoutes) {
  const dir = routePathToDistDir(routePath);
  if (dir) shellDirs.add(dir);
}

let created = 0;
for (const route of shellDirs) {
  const dir = join(dist, ...route.split("/"));
  mkdirSync(dir, { recursive: true });
  copyFileSync(indexHtml, join(dir, "index.html"));
  created += 1;
}

const missing = [];
for (const route of staticRoutes) {
  const dir = routePathToDistDir(route);
  if (!dir) continue;
  const shell = join(dist, ...dir.split("/"), "index.html");
  if (!existsSync(shell)) missing.push(route);
}

if (missing.length > 0) {
  console.error("[prepare-static-dist] Missing route shells:");
  for (const route of missing) console.error(`  - ${route}`);
  process.exit(1);
}

const entries = readdirSync(dist);
console.log(
  `[prepare-static-dist] Ready: dist/ (${entries.length} top-level items, ${created} route shells, ${staticRoutes.length} static routes verified)`,
);
