/**
 * Copies the pdfjs-dist worker bundle into `public/` so the browser
 * fetches it from our own origin instead of a CDN. Runs from postinstall.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const src = join("node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const dest = join("public", "pdf.worker.min.mjs");
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
