import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { version } = require("pdfjs-dist/package.json");
await mkdir(new URL("../public/pdfjs/", import.meta.url), { recursive: true });
await copyFile(require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs"), new URL(`../public/pdfjs/pdf.worker-${version}.min.mjs`, import.meta.url));
await copyFile(require.resolve("pdfjs-dist/LICENSE"), new URL("../public/pdfjs/LICENSE", import.meta.url));
