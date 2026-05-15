import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: parseInt(process.env.PORT ?? "5173"),
    host: "0.0.0.0",
    allowedHosts: true,
  },
  build: {
    outDir: "dist/public",
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          /* Supabase in its own chunk — loaded only after login */
          if (id.includes("@supabase")) return "supabase";

          /* Recharts + d3 — large, only used on dashboards */
          if (id.includes("recharts") || id.includes("d3-") || id.includes("victory-")) return "charts";

          /* Radix UI primitives */
          if (id.includes("@radix-ui")) return "radix";

          /* React core — tiny, always needed */
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) return "react";

          /* TanStack Query */
          if (id.includes("@tanstack")) return "query";

          /* Everything else from node_modules → vendor */
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
    /* Raise the chunk-size warning threshold so CI doesn't warn about recharts */
    chunkSizeWarningLimit: 600,
  },
});
