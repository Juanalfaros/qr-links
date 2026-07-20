import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers';

async function createLink(page: Page, title: string) {
  await page.click('button:has-text("Nuevo link")');
  await page.fill('#title', title);
  await page.fill('#destination_url', 'https://example.com');
  await page.click('button:has-text("Crear link")');
  await expect(page.getByText('SVG')).toBeVisible();
  await page.keyboard.press('Escape');

  const row = page.locator('table tbody tr', { hasText: title });
  const anchor = row.locator('a[href^="/admin/analytics/"]');
  const shortCode = await anchor.innerText();
  const href = await anchor.getAttribute('href');
  const id = href!.split('/').pop()!;
  return { id, shortCode };
}

function kpiValue(page: Page, label: string) {
  return page
    .locator('[data-slot="card"]', { has: page.getByText(label, { exact: true }) })
    .locator('[data-slot="card-title"]');
}

test.describe('analytics foundations (Fase 3)', () => {
  test('total/unique clicks, referrer breakdown, CSV export, date-range filter, and comparing links', async ({
    page,
    request,
  }) => {
    await login(page);

    const titleA = `Fase3 A ${Date.now()}`;
    const { id: idA, shortCode: shortCodeA } = await createLink(page, titleA);

    const titleB = `Fase3 B ${Date.now()}`;
    await createLink(page, titleB);

    // Two clicks on the same link from two distinct referrers, both from the
    // test runner (same IP) on the same day => total=2, unique=1.
    await request.get(`/${shortCodeA}`, {
      maxRedirects: 0,
      headers: { referer: 'https://google.com/search?q=x' },
    });
    await request.get(`/${shortCodeA}`, {
      maxRedirects: 0,
      headers: { referer: 'https://news.ycombinator.com/' },
    });

    await page.goto(`/admin/analytics/${idA}`);
    await page.waitForLoadState('networkidle');

    await expect(kpiValue(page, 'Clics totales')).toHaveText('2');
    // Real uniqueness (both scans collapsing to 1 distinct visitor) can't be
    // exercised here: cf-connecting-ip is only injected by Cloudflare's real
    // edge network, not by local `astro preview`'s workerd simulation — same
    // limitation the existing code already accepts for Astro.request.cf (geo
    // data is empty locally too). This just confirms the KPI renders cleanly.
    await expect(kpiValue(page, 'Clics únicos')).toHaveText('0');

    const referrerCard = page.locator('[data-slot="card"]', { has: page.getByText('Por referrer', { exact: true }) });
    await expect(referrerCard.getByText('google.com')).toBeVisible();
    await expect(referrerCard.getByText('news.ycombinator.com')).toBeVisible();

    // CSV export
    const csvRes = await page.request.get(`/api/analytics/${idA}/export.csv`);
    expect(csvRes.status()).toBe(200);
    expect(csvRes.headers()['content-type']).toContain('text/csv');
    const csvBody = await csvRes.text();
    const csvLines = csvBody.trim().split('\r\n');
    expect(csvLines[0]).toBe('scanned_at,country,city,device,os,browser,referrer,utm_source');
    expect(csvLines).toHaveLength(3); // header + 2 scans

    // Date-range filter: a range that starts tomorrow must exclude both scans.
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await page.goto(`/admin/analytics/${idA}?from=${tomorrow}`);
    await page.waitForLoadState('networkidle');
    await expect(kpiValue(page, 'Clics totales')).toHaveText('0');
    await expect(kpiValue(page, 'Clics únicos')).toHaveText('0');

    // Compare links
    await page.goto('/admin/analytics/compare');
    await page.getByLabel(titleA).check();
    await page.getByLabel(titleB).check();
    await page.click('button:has-text("Comparar")');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('row', { name: titleA })).toBeVisible();
    await expect(page.getByRole('row', { name: titleB })).toBeVisible();
  });
});
