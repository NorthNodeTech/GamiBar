/**
 * Flatten TanStack SPA output for static hosts (Render, Netlify, etc.).
 * After `vite build`: dist/client + dist/server → single publishable dist/
 *
 * Materializes index.html under every static route so deep links and refresh
 * work even when the host has not applied a SPA rewrite rule yet.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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

function normalizeHtmlDocuments(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      normalizeHtmlDocuments(path);
      continue;
    }
    if (!entry.isFile() || entry.name !== "index.html") continue;

    const html = readFileSync(path, "utf8");
    const closingTagEnd = html.lastIndexOf("</html>") + "</html>".length;
    if (closingTagEnd < "</html>".length) continue;

    const normalized = `${html.slice(0, closingTagEnd)}\n`;
    if (normalized !== html) writeFileSync(path, normalized);
  }
}

// Prerender output must end at the document boundary. This also strips any
// stale trailing bytes that a streamed render may leave after </html>.
normalizeHtmlDocuments(dist);

// Netlify-style; some CDNs honor this. Render still needs Dashboard/Blueprint rewrites
// for dynamic paths like /play/:roomId and /author/room/:roomId.
writeFileSync(join(dist, "_redirects"), "/*    /index.html   200\n");

// Some hosts serve 404.html for unknown paths - load the SPA shell.
copyFileSync(indexHtml, join(dist, "404.html"));

const staticRoutes = extractStaticRoutes(root);

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
  `[prepare-static-dist] Ready: dist/ (${entries.length} top-level items, ${staticRoutes.length} prerendered routes verified)`,
);
