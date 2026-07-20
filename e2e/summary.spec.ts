import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('resumen', () => {
  test('shows KPIs, a donut chart, attention items for at-risk links, and a filterable links table', async ({
    page,
    request,
  }) => {
    await login(page);
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');

    // Link A: max_clicks=1, then scanned once — click_count (1) >= max_clicks
    // * 0.8, so it deterministically lands in the "near its limit" attention
    // bucket and the table's "Por vencer" tab.
    const titleA = `Resumen limit ${Date.now()}`;
    await page.click('button:has-text("Nuevo link")');
    await page.fill('#title', titleA);
    await page.fill('#destination_url', 'https://example.com');
    await page.click('summary:has-text("Opciones avanzadas")');
    await page.fill('#create-max_clicks', '1');
    await page.click('button:has-text("Crear link")');
    await expect(page.getByText('SVG')).toBeVisible();
    await page.keyboard.press('Escape');

    const rowA = page.locator('table tbody tr', { hasText: titleA });
    const shortCodeA = await rowA.locator('a[href^="/admin/analytics/"]').innerText();
    await request.get(`/${shortCodeA}`, { maxRedirects: 0 });

    // Link B: password-protected, no expiry/limit — lands in "Protegidos".
    const titleB = `Resumen protected ${Date.now()}`;
    await page.click('button:has-text("Nuevo link")');
    await page.fill('#title', titleB);
    await page.fill('#destination_url', 'https://example.com');
    await page.click('summary:has-text("Opciones avanzadas")');
    await page.fill('#create-password', 'secret123');
    await page.click('button:has-text("Crear link")');
    await expect(page.getByText('SVG')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.goto('/admin/summary');
    await page.waitForLoadState('networkidle');

    // KPI stats
    await expect(page.getByText('Clics totales')).toBeVisible();
    await expect(page.getByText('Clics únicos')).toBeVisible();
    await expect(page.getByText('Links activos')).toBeVisible();

    // Donut chart renders
    await expect(page.getByRole('img', { name: /Gráfico de/ })).toBeVisible();

    // Range tabs (server-rendered links, not a client island) update the URL.
    await page.click('a:has-text("30 días")');
    await expect(page).toHaveURL(/range=month/);
    await page.waitForLoadState('networkidle');

    // Attention section renders (its top-2 slice is shared, ever-growing test
    // account state, so this only checks it renders — not that titleA is in
    // the visible slice. The status-computation logic itself is verified
    // deterministically below via the links table, which always includes the
    // 12 most recent links).
    await expect(page.locator('h2:has-text("Necesita tu atención")')).toBeVisible();

    // Links table: default "Todos" tab has both fixtures.
    const panel = page.getByRole('tabpanel');
    await expect(panel.locator('tbody tr', { hasText: titleA })).toBeVisible();
    await expect(panel.locator('tbody tr', { hasText: titleB })).toBeVisible();

    // "Por vencer" tab: only the near-limit link.
    await page.getByRole('tab', { name: 'Por vencer' }).click();
    await expect(panel.locator('tbody tr', { hasText: titleA })).toBeVisible();
    await expect(panel.locator('tbody tr', { hasText: titleB })).toHaveCount(0);

    // "Protegidos" tab: only the password-protected link.
    await page.getByRole('tab', { name: 'Protegidos' }).click();
    await expect(panel.locator('tbody tr', { hasText: titleB })).toBeVisible();
    await expect(panel.locator('tbody tr', { hasText: titleA })).toHaveCount(0);
  });
});
