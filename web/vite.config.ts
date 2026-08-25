import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [solid()],
  base: "/toolchain-advisor/",
  resolve: {
    alias: {
      "@dev-centr/toolchain-advisor-core": resolve(
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
