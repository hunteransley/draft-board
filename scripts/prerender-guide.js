#!/usr/bin/env node
// Prerender /guide page for SEO.
// Runs after `vite build` — launches headless Chrome against the built dist,
// captures the fully-rendered HTML, and saves it as dist/guide/index.html.
// Crawlers get the static HTML; users get the same React app.

import { existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "..", "dist");

async function main() {
  const port = 4199;
  const puppeteer = await import("puppeteer");

  // Mime types for the static server
  const mimeTypes = {
    ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
    ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
    ".ico": "image/x-icon", ".json": "application/json",
    ".woff2": "font/woff2", ".woff": "font/woff",
  };

  // Minimal static file server with SPA fallback
  const server = await new Promise((resolve) => {
    const srv = createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      let filePath = join(DIST, url.pathname === "/" ? "index.html" : url.pathname);
      // SPA fallback — serve index.html for unknown paths (like /guide)
      if (!existsSync(filePath)) filePath = join(DIST, "index.html");
      try {
        const data = readFileSync(filePath);
        const ext = "." + filePath.split(".").pop();
        res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    });
    srv.listen(port, () => resolve(srv));
  });

  console.log(`[prerender] Serving dist on http://localhost:${port}`);

  const browser = await puppeteer.default.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}/guide`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Wait for the guide content to render
    await page.waitForSelector("h1", { timeout: 10000 });

    // Grab the full rendered HTML
    const html = await page.content();

    // Save to dist/guide/index.html
    const outDir = join(DIST, "guide");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "index.html"), html, "utf8");

    console.log(`[prerender] Saved dist/guide/index.html (${(html.length / 1024).toFixed(1)} KB)`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error("[prerender] Failed:", err.message);
  // Non-fatal — build still succeeds without prerendered guide
  process.exit(0);
});
