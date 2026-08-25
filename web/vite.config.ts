import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [solid()],
  base: "/stack-advisor/",
  resolve: {
    alias: {
      "@dev-centr/stack-advisor-core": resolve(
        root,
        "../lib/src/index.ts",
      ),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
