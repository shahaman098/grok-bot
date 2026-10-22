import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const packageDir = dirname(require.resolve("maplibre-gl/package.json"));
const output = fileURLToPath(new URL("../public/maplibre/", import.meta.url));
await mkdir(output, { recursive: true });
// Serve the standalone module from our origin; the bundler rewrites import.meta.url.
await copyFile(join(packageDir, "dist/maplibre-gl-worker.mjs"), join(output, "maplibre-gl-worker.mjs"));
await copyFile(join(packageDir, "LICENSE.txt"), join(output, "LICENSE.txt"));
