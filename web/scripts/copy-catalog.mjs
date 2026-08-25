import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const webRoot = join(root, "..");
const repoRoot = join(webRoot, "..");
const srcJson = join(repoRoot, "catalog", "advisor.json");
const destDir = join(webRoot, "public", "catalog");
const destJson = join(destDir, "advisor.json");

if (!existsSync(srcJson)) {
  console.error("Missing catalog/advisor.json — run compile-sdl.mjs first");
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(srcJson, destJson);
console.log("Copied catalog → web/public/catalog/advisor.json");
