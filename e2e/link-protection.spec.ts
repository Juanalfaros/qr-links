import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('link protection (Fase 2)', () => {
  test('max_clicks enforcement blocks the link after the limit is reached', async ({ page, request }) => {
    await login(page);

    const title = `Fase2 maxclicks ${Date.now()}`;
    await page.click('button:has-text("Nuevo link")');
    await page.fill('#title', title);
    await page.fill('#destination_url', 'https://example.com');
    await page.click('summary:has-text("Opciones avanzadas")');
    await page.fill('#create-max_clicks', '1');
    await page.click('button:has-text("Crear link")');
    await expect(page.getByText('SVG')).toBeVisible();
    await page.keyboard.press('Escape');

    const row = page.locator('table tbody tr', { hasText: title });
    const shortCode = await row.locator('a[href^="/admin/analytics/"]').innerText();

    const first = await request.get(`/${shortCode}`, { maxRedirects: 0 });
    expect(first.status()).toBe(302);

    const second = await request.get(`/${shortCode}`, { maxRedirects: 0 });
    expect(second.status()).not.toBe(302);
    const body = await second.text();
    expect(body).toContain('no disponible');
  });

  test('password-protected link requires the correct password before redirecting', async ({ page, context }) => {
    await login(page);

    const title = `Fase2 password ${Date.now()}`;
    await page.click('button:has-text("Nuevo link")');
    await page.fill('#title', title);
    await page.fill('#destination_url', 'https://example.com');
    await page.click('summary:has-text("Opciones avanzadas")');
    await page.fill('#create-password', 'secreto123');
    await page.click('button:has-text("Crear link")');
    await expect(page.getByText('SVG')).toBeVisible();
    await page.keyboard.press('Escape');

    const row = page.locator('table tbody tr', { hasText: title });
    const shortCode = await row.locator('a[href^="/admin/analytics/"]').innerText();

    // Fresh unauthenticated context, like a real visitor following the link.
    const visitorPage = await context.newPage();
    await visitorPage.goto(`/${shortCode}`);
    await expect(visitorPage.getByText('protegido')).toBeVisible();

    await visitorPage.fill('input[name="password"]', 'wrong-password');
    await visitorPage.click('button:has-text("Continuar")');
    await expect(visitorPage.getByText('incorrecta')).toBeVisible();

    await visitorPage.fill('input[name="password"]', 'secreto123');
    await visitorPage.click('button:has-text("Continuar")');
    await visitorPage.waitForURL('https://example.com/**');
    await visitorPage.close();
  });

  test('interstitial link shows a confirmation page instead of redirecting immediately', async ({ page, context }) => {
    await login(page);

    const title = `Fase2 interstitial ${Date.now()}`;
    await page.click('button:has-text("Nuevo link")');
    await page.fill('#title', title);
    await page.fill('#destination_url', 'https://example.com');
    await page.click('summary:has-text("Opciones avanzadas")');
    await page.getByLabel('Mostrar advertencia antes de redirigir').check();
    await page.click('button:has-text("Crear link")');
    await expect(page.getByText('SVG')).toBeVisible();
    await page.keyboard.press('Escape');

    const row = page.locator('table tbody tr', { hasText: title });
    const shortCode = await row.locator('a[href^="/admin/analytics/"]').innerText();

    const visitorPage = await context.newPage();
    await visitorPage.goto(`/${shortCode}`);
    await expect(visitorPage.getByText('Vas a salir de')).toBeVisible();
    await visitorPage.click('a:has-text("Continuar")');
    await visitorPage.waitForURL('https://example.com/**');
    await visitorPage.close();
  });

  test('UTM builder appends utm params to the destination URL', async ({ page, request }) => {
    await login(page);

    const title = `Fase2 utm ${Date.now()}`;
    await page.click('button:has-text("Nuevo link")');
    await page.fill('#title', title);
    await page.fill('#destination_url', 'https://example.com');
    await page.click('summary:has-text("Parámetros UTM")');
    await page.fill('#create-utm_source', 'newsletter');
    await page.fill('#create-utm_medium', 'email');
    await page.click('button:has-text("Crear link")');
    await expect(page.getByText('SVG')).toBeVisible();
    await page.keyboard.press('Escape');

    const row = page.locator('table tbody tr', { hasText: title });
    const shortCode = await row.locator('a[href^="/admin/analytics/"]').innerText();

    const res = await request.get(`/${shortCode}`, { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    const location = res.headers()['location'];
    expect(location).toContain('utm_source=newsletter');
    expect(location).toContain('utm_medium=email');
  });
});
