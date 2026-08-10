// @lovable.dev/vite-tanstack-config already includes TanStack Start, React, Tailwind, etc.
// Static SPA deploy (Render Static Site): no Nitro / Wrangler — output goes to `dist/`.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { extractStaticRoutes } from "./scripts/extract-static-routes.mjs";

const staticPages = extractStaticRoutes().map((path) => ({ path }));

export default defineConfig({
  // Skip Cloudflare/Node server bundle entirely.
  nitro: false,
  tanstackStart: {
    server: { entry: "server" },
    // Pre-render every static route at build time (HTML shells under dist/<route>/).
    pages: staticPages,
    prerender: {
      enabled: true,
      autoStaticPathsDiscovery: true,
      crawlLinks: true,
      failOnError: false,
    },
    spa: {
      enabled: true,
      prerender: {
        outputPath: "/index.html",
        crawlLinks: true,
      },
    },
  },
  vite: {
    resolve: {
      tsconfigPaths: true,
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      chunkSizeWarningLimit: 1200,
      rolldownOptions: {
        checks: {
          pluginTimings: false,
        },
      },
    },
  },
});
