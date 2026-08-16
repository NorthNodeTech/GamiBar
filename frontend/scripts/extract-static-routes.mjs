/**
 * Parse static (non-dynamic) routes from TanStack Router's generated route tree.
 * Used by post-build static hosting scripts and vite prerender config.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * @param {string} [root]
 * @returns {string[]}
 */
export function extractStaticRoutes(root = process.cwd()) {
  const routeTreePath = join(root, "src", "routeTree.gen.ts");
  const source = readFileSync(routeTreePath, "utf8");

  const blockMatch = source.match(/fullPaths:\s*\n([\s\S]*?)\n\s*fileRoutesByTo/);
  if (!blockMatch) {
    throw new Error("[extract-static-routes] Could not parse fullPaths from routeTree.gen.ts");
  }

  const paths = [...blockMatch[1].matchAll(/\|\s*"([^"]+)"|\|\s*'([^']+)'/g)].map(
    (match) => match[1] ?? match[2],
  );

  return [...new Set(paths.filter((path) => path !== "/" && !path.includes("$")))];
}

/**
 * Convert a router path to a dist subdirectory (without index.html).
 * `/author/create` → `author/create`
 * `/join/` → `join`
 * @param {string} routePath
 * @returns {string | null}
 */
export function routePathToDistDir(routePath) {
  const trimmed = routePath.replace(/\/+$/, "");
  if (!trimmed) return null;
  return trimmed.replace(/^\//, "");
}
