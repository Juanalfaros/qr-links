import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('advanced QR and channel attribution (Fase 8)', () => {
  test('QR customization renders, channel attribution tracks QR vs direct clicks, and bulk export works', async ({
    page,
    request,
  }) => {
    await login(page);

    const title = `Fase8 ${Date.now()}`;
    await page.click('button:has-text("Nuevo link")');
    await page.fill('#title', title);
    await page.fill('#destination_url', 'https://example.com');
    await page.click('button:has-text("Crear link")');
    await expect(page.getByText('SVG')).toBeVisible();

    // QR customization: toggling the frame grows the canvas (padding added),
    // proving the customization panel actually drives the render.
    await page.click('summary:has-text("Personalizar")');
    const canvas = page.locator('canvas');
    const initialWidth = await canvas.evaluate((el) => (el as HTMLCanvasElement).width);
    await page.locator('label', { hasText: 'Escanéame' }).locator('input[type="checkbox"]').check();
    await expect.poll(() => canvas.evaluate((el) => (el as HTMLCanvasElement).width)).toBeGreaterThan(initialWidth);
    await page.locator('label', { hasText: 'Incluir logo' }).locator('input[type="checkbox"]').check();
    await page.keyboard.press('Escape');

    const row = page.locator('table tbody tr', { hasText: title });
    const analyticsLink = row.locator('a[href^="/admin/analytics/"]');
    const shortCode = await analyticsLink.innerText();
    const linkId = (await analyticsLink.getAttribute('href'))!.split('/').pop()!;

    // Channel attribution: one scan tagged as a QR scan, one as a plain click.
    await request.get(`/${shortCode}?src=qr`, { maxRedirects: 0 });
    await request.get(`/${shortCode}`, { maxRedirects: 0 });

    await page.goto(`/admin/analytics/${linkId}`);
    await page.waitForLoadState('networkidle');
    const channelCard = page.locator('[data-slot="card"]', { has: page.getByText('Por canal', { exact: true }) });
    await expect(channelCard.getByText('Código QR')).toBeVisible();
    await expect(channelCard.getByText('Link directo')).toBeVisible();

    // Bulk export: pick this link, download both formats.
    await page.goto('/admin/qr-bulk-export');
    await page.locator(`input[type="checkbox"][value="${linkId}"]`).check();
    await page.click('button:has-text("Continuar")');

    const zipHref = await page.getByText('Descargar ZIP (SVG)').getAttribute('href');
    const pdfHref = await page.getByText('Descargar PDF').getAttribute('href');

    const zipRes = await page.request.get(zipHref!);
    expect(zipRes.status()).toBe(200);
    expect(zipRes.headers()['content-type']).toContain('application/zip');
    const zipBody = await zipRes.body();
    expect(zipBody.subarray(0, 2).toString('latin1')).toBe('PK');

    const pdfRes = await page.request.get(pdfHref!);
    expect(pdfRes.status()).toBe(200);
    expect(pdfRes.headers()['content-type']).toContain('application/pdf');
    const pdfBody = await pdfRes.body();
    expect(pdfBody.subarray(0, 5).toString('utf-8')).toBe('%PDF-');
  });
});
