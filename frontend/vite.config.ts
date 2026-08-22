import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

const permissionsPolicy =
  'camera=(self), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com"), accelerometer=(self "https://checkout.razorpay.com" "https://api.razorpay.com"), gyroscope=(self "https://checkout.razorpay.com" "https://api.razorpay.com"), magnetometer=(self "https://checkout.razorpay.com" "https://api.razorpay.com"), usb=()';

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    headers: {
      "Permissions-Policy": permissionsPolicy,
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
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
  plugins: [tailwindcss(), react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@shared": fileURLToPath(new URL("../shared", import.meta.url)),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
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
