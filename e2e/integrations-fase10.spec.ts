import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('integrations (Fase 10)', () => {
  test('API tokens: create, use the public API, and revoke', async ({ page, request }) => {
    await login(page);
    await page.goto('/admin/api-tokens');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Nuevo token")');
    const tokenName = `Fase10 token ${Date.now()}`;
    await page.fill('#token-name', tokenName);
    await page.click('button:has-text("Crear token")');

    await expect(page.getByText('Token creado')).toBeVisible();
    const plaintext = (await page.locator('div.font-mono').innerText()).trim();
    expect(plaintext).toMatch(/^qrgyg_[0-9a-f]+/);
    await page.click('button:has-text("Listo")');
    await expect(page.getByText(tokenName)).toBeVisible();

    // Use the freshly created token against the public API.
    const title = `Fase10 public ${Date.now()}`;
    const createRes = await request.post('/api/public/links', {
      headers: { Authorization: `Bearer ${plaintext}` },
      data: { title, destination_url: 'https://example.com' },
    });
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()) as { link: { id: string; short_code: string } };

    const listRes = await request.get('/api/public/links', {
      headers: { Authorization: `Bearer ${plaintext}` },
    });
    expect(listRes.status()).toBe(200);
    const { links } = (await listRes.json()) as { links: { id: string }[] };
    expect(links.some((l) => l.id === created.link.id)).toBe(true);

    // A request with no token, or a garbage one, is rejected.
    const noAuthRes = await request.get('/api/public/links');
    expect(noAuthRes.status()).toBe(401);

    // Revoke, then confirm the same token no longer works. Scoped to the
    // `justify-between` row div specifically — a plain `div` filter also
    // matches the ancestor list container, which holds every token's row.
    const row = page.locator('div.justify-between', { hasText: tokenName });
    await row.getByRole('button', { name: 'Revocar' }).click();
    await page.getByRole('button', { name: 'Revocar' }).last().click();
    await expect(page.getByText('Token revocado')).toBeVisible();

    const afterRevokeRes = await request.get('/api/public/links', {
      headers: { Authorization: `Bearer ${plaintext}` },
    });
    expect(afterRevokeRes.status()).toBe(401);
  });

  test('scan webhook fires and GA tag is injected on the interstitial page', async ({ page, request }) => {
    const received: unknown[] = [];
    const server = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        received.push(JSON.parse(body || '{}'));
        res.writeHead(200);
        res.end();
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    const webhookUrl = `http://127.0.0.1:${port}/hook`;

    await login(page);
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');

    const title = `Fase10 webhook ${Date.now()}`;
    await page.click('button:has-text("Nuevo link")');
    await page.fill('#title', title);
    await page.fill('#destination_url', 'https://example.com');
    await page.click('summary:has-text("Integraciones")');
    await page.fill('#create-webhook_url', webhookUrl);
    await page.fill('#create-ga_tracking_id', 'G-TESTID123');
    await page.click('summary:has-text("Opciones avanzadas")');
    await page.locator('label', { hasText: 'Mostrar advertencia antes de redirigir' }).locator('input').check();
    await page.click('button:has-text("Crear link")');
    await expect(page.getByText('SVG')).toBeVisible();
    await page.keyboard.press('Escape');

    const row = page.locator('table tbody tr', { hasText: title });
    const shortCode = await row.locator('a[href^="/admin/analytics/"]').innerText();

    const redirectRes = await request.get(`/${shortCode}`, { maxRedirects: 0 });
    expect(redirectRes.status()).toBe(200); // interstitial page, not a 302
    const html = await redirectRes.text();
    expect(html).toContain('/scripts/ga-init.js');
    expect(html).toContain('data-ga-id="G-TESTID123"');

    await expect.poll(() => received.length, { timeout: 10_000 }).toBeGreaterThan(0);
    expect(received[0]).toMatchObject({ event: 'link.scanned', short_code: shortCode });

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('Bitly CSV import creates links', async ({ page }) => {
    await login(page);
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');

    const title = `Fase10 bitly ${Date.now()}`;
    const csv = `long_url,title\nhttps://example.com/imported,${title}\n`;

    await page.click('button:has-text("Importar de Bitly")');
    await page.setInputFiles('#bitly-import-file', {
      name: 'bitly.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    });
    await page.getByRole('button', { name: 'Importar', exact: true }).click();
    await expect(page.getByText('1 link(s) importado(s).')).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(page.locator('table tbody tr', { hasText: title })).toBeVisible();
  });
});
