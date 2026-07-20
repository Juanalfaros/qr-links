import { test, expect, type Page } from '@playwright/test';
import { goToSuperadminDashboard, login } from './helpers';

async function attemptCreateLink(page: Page, destinationUrl: string) {
  await page.click('button:has-text("Nuevo link")');
  await page.fill('#title', `Fase5 ${Date.now()}`);
  await page.fill('#destination_url', destinationUrl);
  await page.click('button:has-text("Crear link")');
}

// The "Seguridad" tab has no URL-driven default (only ?tab=links is
// recognized by superadmin/dashboard.astro) and Base UI's Tabs only mounts
// the active panel's content, so this always clicks the tab trigger rather
// than relying on a query param.
async function goToSecurityTab(page: Page) {
  await goToSuperadminDashboard(page);
  await page.getByRole('tab', { name: 'Seguridad' }).click();
}

async function removeListItem(page: Page, value: string) {
  await goToSecurityTab(page);
  await page.locator('li', { hasText: value }).getByRole('button', { name: 'Quitar' }).click();
  await expect(page.getByText(value, { exact: true })).not.toBeVisible();
}

test.describe('security core (Fase 5)', () => {
  test('blocked url patterns and the domain allowlist are enforced on link creation', async ({ page }) => {
    await login(page);

    // Blocklist: a pattern rejects link creation, then gets cleaned up.
    await goToSecurityTab(page);
    const blockedForm = page
      .locator('form')
      .filter({ has: page.locator('input[placeholder="dominio-sospechoso.com"]') });
    const blockedPattern = `blocked-fase5-${Date.now()}.invalid`;
    await blockedForm.locator('input').fill(blockedPattern);
    await blockedForm.getByRole('button', { name: 'Agregar' }).click();
    await expect(page.getByText(blockedPattern)).toBeVisible();

    try {
      await page.goto('/admin/dashboard');
      await page.waitForLoadState('networkidle');
      await attemptCreateLink(page, `https://${blockedPattern}/page`);
      await expect(page.getByText('bloqueado por seguridad')).toBeVisible();
      await page.keyboard.press('Escape');
    } finally {
      // Must run even on assertion failure: a stray blocked pattern is
      // harmless to other tests, but leaving cleanup conditional is a bad
      // habit given the allowlist case right below actually matters.
      await removeListItem(page, blockedPattern);
    }

    // Allowlist: once populated, only listed domains may be used — this
    // restricts link creation for the whole (shared) test project, not just
    // this test's own data, so the removal is wrapped in try/finally to
    // guarantee it runs even if an assertion below fails.
    await goToSecurityTab(page);
    const allowedForm = page.locator('form').filter({ has: page.locator('input[placeholder="ejemplo.com"]') });
    const allowedDomain = 'example.com';
    await allowedForm.locator('input').fill(allowedDomain);
    await allowedForm.getByRole('button', { name: 'Agregar' }).click();
    await expect(page.getByText(allowedDomain, { exact: true })).toBeVisible();

    try {
      await page.goto('/admin/dashboard');
      await page.waitForLoadState('networkidle');
      await attemptCreateLink(page, 'https://not-on-the-allowlist-fase5.test');
      await expect(page.getByText('no está permitido por la política de la empresa')).toBeVisible();
      await page.keyboard.press('Escape');

      await attemptCreateLink(page, 'https://example.com/allowed-ok');
      await expect(page.getByText('SVG')).toBeVisible();
      await page.keyboard.press('Escape');
    } finally {
      await removeListItem(page, allowedDomain);
    }
  });
});
