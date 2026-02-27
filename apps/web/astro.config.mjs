import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  integrations: [react(), tailwind()],
  vite: {
    // Pre-bundle the compiled shared package so Vite doesn't try to crawl it
    // as raw source. Requires `pnpm build:shared` (or `pnpm dev`) to run first
    // so that packages/shared/dist/index.js exists.
    optimizeDeps: {
      include: ["@games-hub/shared"],
    },
  },
});
