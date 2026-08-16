// Static SPA deploy (Render Static Site): no Nitro or Wrangler. Output goes to `dist/`.
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
// @ts-expect-error This build helper is intentionally maintained as an ESM script.
import { extractStaticRoutes } from "./scripts/extract-static-routes.mjs";

const staticPages = extractStaticRoutes().map((path: string) => ({ path }));

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
    watch: {
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100,
      },
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
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
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
    react(),
  ],
  resolve: {
    tsconfigPaths: true,
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
    ignoreOutdatedRequests: true,
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
});
