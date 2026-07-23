// One-off dev script (not part of build/deploy) — rasterizes public/logo.svg
// into the 3 default PWA manifest icons under public/icons/, using a real
// browser (Playwright, already a devDependency for e2e) so the exact same
// <canvas> drawing logic as src/lib/pwa-icon.ts produces them — no native
// image-processing dependency needed, and defaults are generated with the
// identical code path as user-uploaded logos.
//
// Re-run by hand only if public/logo.svg's artwork changes:
//   node scripts/generate-default-pwa-icons.mjs
import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const logoSvg = await readFile(path.join(rootDir, 'public/logo.svg'), 'utf-8');
const iconsDir = path.join(rootDir, 'public/icons');
await mkdir(iconsDir, { recursive: true });

// logo.svg's own viewBox (no explicit width/height attributes on the root
// element, so a headless browser's naturalWidth/naturalHeight can't be
// trusted here — pass the real aspect ratio explicitly instead).
const SOURCE_WIDTH = 133.33;
const SOURCE_HEIGHT = 153.62;
const MASKABLE_BACKGROUND = '#ffffff';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');

const targets = [
  { name: 'icon-192.png', size: 192, safeZoneRatio: 1, background: null },
  { name: 'icon-512.png', size: 512, safeZoneRatio: 1, background: null },
  { name: 'icon-512-maskable.png', size: 512, safeZoneRatio: 0.8, background: MASKABLE_BACKGROUND },
];

for (const target of targets) {
  const base64 = await page.evaluate(
    async ({ svg, sourceWidth, sourceHeight, size, safeZoneRatio, background }) => {
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, size, size);
      }

      const maxDim = size * safeZoneRatio;
      const scale = Math.min(maxDim / sourceWidth, maxDim / sourceHeight);
      const dw = sourceWidth * scale;
      const dh = sourceHeight * scale;
      const dx = (size - dw) / 2;
      const dy = (size - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);

      return canvas.toDataURL('image/png').split(',')[1];
    },
    { svg: logoSvg, sourceWidth: SOURCE_WIDTH, sourceHeight: SOURCE_HEIGHT, ...target },
  );

  await writeFile(path.join(iconsDir, target.name), Buffer.from(base64, 'base64'));
  console.log(`Generated public/icons/${target.name}`);
}

await browser.close();
