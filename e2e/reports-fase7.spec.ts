import { test, expect } from '@playwright/test';
import { goToSuperadminDashboard, login } from './helpers';

test.describe('consolidated reports (Fase 7)', () => {
  test('company-wide analytics tab, alert rules, and PDF export', async ({ page, request }) => {
    await login(page);

    // A link to export a PDF report for later.
    const title = `Fase7 ${Date.now()}`;
    await page.click('button:has-text("Nuevo link")');
    await page.fill('#title', title);
    await page.fill('#destination_url', 'https://example.com');
    await page.click('button:has-text("Crear link")');
    await expect(page.getByText('SVG')).toBeVisible();
    await page.keyboard.press('Escape');

    const row = page.locator('table tbody tr', { hasText: title });
    const analyticsLink = row.locator('a[href^="/admin/analytics/"]');
    const href = await analyticsLink.getAttribute('href');
    const linkId = href!.split('/').pop()!;

    // Company-wide analytics tab: KPIs + world map render.
    await goToSuperadminDashboard(page);
    await page.getByRole('tab', { name: 'Analíticas' }).click();
    await expect(page.getByText('Clics totales')).toBeVisible();
    await expect(page.getByText('Clics por país')).toBeVisible();
    await expect(
      page.locator('[data-slot="card"]', { has: page.getByText('Clics por país') }).locator('svg'),
    ).toBeVisible({
      timeout: 15_000,
    });

    // Alert rules: create a company-wide rule, confirm it renders, clean up.
    await page.getByRole('tab', { name: 'Alertas' }).click();
    await page.fill('#alert-threshold', '9999');
    await page.fill('#alert-window', '24');
    const alertEmail = `alerts-fase7-${Date.now()}@example.com`;
    await page.fill('#alert-email', alertEmail);
    await page.click('button:has-text("Crear alerta")');
    await expect(page.getByText(alertEmail)).toBeVisible();

    const ruleItem = page.locator('li', { hasText: alertEmail });
    await ruleItem.getByRole('button', { name: 'Quitar' }).click();
    await expect(page.getByText(alertEmail)).not.toBeVisible();

    // PDF export
    const pdfRes = await page.request.get(`/api/analytics/${linkId}/export.pdf`);
    expect(pdfRes.status()).toBe(200);
    expect(pdfRes.headers()['content-type']).toContain('application/pdf');
    const pdfBody = await pdfRes.body();
    expect(pdfBody.subarray(0, 5).toString('utf-8')).toBe('%PDF-');

    // Scheduled handler: both cron branches run without throwing. Real email
    // delivery isn't verified here — that depends on a real RESEND_API_KEY,
    // which isn't available in this environment (see README).
    const alertCronRes = await request.get('/cdn-cgi/handler/scheduled?cron=0+*+*+*+*');
    expect(alertCronRes.ok()).toBe(true);
    const digestCronRes = await request.get('/cdn-cgi/handler/scheduled?cron=0+8+*+*+1');
    expect(digestCronRes.ok()).toBe(true);
  });
});
