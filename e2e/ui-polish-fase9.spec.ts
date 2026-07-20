import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { test, expect } from '@playwright/test';
import { login, goToSuperadminDashboard } from './helpers';

function loadDevVars(): Record<string, string> {
  const content = readFileSync(path.resolve(process.cwd(), '.dev.vars'), 'utf-8');
  const vars: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    vars[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return vars;
}

let fixtureEmail: string;
let fixturePassword: string;

test.beforeAll(async () => {
  const vars = loadDevVars();
  const admin = createClient(vars.SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  fixtureEmail = `fase9-e2e-${Date.now()}@example.com`;
  fixturePassword = `Fixture-${Date.now()}!`;
  const { error } = await admin.auth.admin.createUser({
    email: fixtureEmail,
    password: fixturePassword,
    email_confirm: true,
  });
  if (error) throw error;
});

test.describe('UI/UX polish (Fase 9)', () => {
  test('command palette finds pages and links; KPI tooltips explain metrics', async ({ page }) => {
    await login(page);
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');

    // Keyboard shortcut opens it; typing filters the static nav items.
    await page.keyboard.press('Control+k');
    await page.fill('input[placeholder="Buscar links o páginas..."]', 'Comparar');
    await page.click('button:has-text("Comparar links")');
    await expect(page).toHaveURL(/\/admin\/analytics\/compare/);

    // No-results state for a query matching nothing.
    await page.getByRole('button', { name: 'Buscar (Ctrl+K)' }).click();
    await page.fill('input[placeholder="Buscar links o páginas..."]', 'zzznoresultsxyz');
    await expect(page.getByText('Sin resultados.')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');

    // Create a link, then find it by title through the palette's live search.
    const title = `Fase9 ${Date.now()}`;
    await page.click('button:has-text("Nuevo link")');
    await page.fill('#title', title);
    await page.fill('#destination_url', 'https://example.com');
    await page.click('button:has-text("Crear link")');
    await expect(page.getByText('SVG')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Buscar (Ctrl+K)' }).click();
    await page.fill('input[placeholder="Buscar links o páginas..."]', title);
    const paletteResults = page.locator('[data-slot="dialog-content"]');
    await expect(paletteResults.getByText(title)).toBeVisible();
    await paletteResults.getByText(title).click();
    await expect(page).toHaveURL(/\/admin\/analytics\/[0-9a-f-]+/);
    await page.waitForLoadState('networkidle');

    // Tooltip on a KPI card explains what the metric means.
    await page.getByRole('button', { name: 'Qué significa: Clics totales' }).hover();
    await expect(page.getByText('Cada vez que se abrió el link')).toBeVisible();
  });

  test('fresh user sees empty states; a role change produces a real in-app notification', async ({ page, browser }) => {
    await login(page, fixtureEmail, fixturePassword);

    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Aún no tienes links')).toBeVisible();
    await expect(page.getByText('Crea tu primer link para empezar')).toBeVisible();

    await page.goto('/admin/dashboard?status=archived');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('No hay links archivados')).toBeVisible();

    // No notifications yet for a brand-new user.
    await page.getByRole('button', { name: 'Notificaciones' }).click();
    await expect(page.getByText('Sin notificaciones.')).toBeVisible();
    await page.keyboard.press('Escape');

    // A superadmin changing this user's role fires the DB trigger that
    // inserts a real notification row — not a synthetic/demo event.
    const superadminContext = await browser.newContext();
    const superadminPage = await superadminContext.newPage();
    await login(superadminPage);
    await goToSuperadminDashboard(superadminPage);
    const row = superadminPage.locator('table tbody tr', { hasText: fixtureEmail });
    await expect(row).toBeVisible();
    await row.getByRole('combobox', { name: 'Rol' }).click();
    await Promise.all([
      superadminPage.waitForResponse((res) => res.url().includes('/api/admin/update-role')),
      superadminPage.getByRole('option', { name: 'manager', exact: true }).click(),
    ]);
    await superadminContext.close();

    // The fixture user now has one unread notification.
    await page.reload();
    await page.waitForLoadState('networkidle');
    const bellButton = page.getByRole('button', { name: 'Notificaciones' });
    await expect(bellButton.getByText('1')).toBeVisible();
    await bellButton.click();
    await expect(page.getByText('Tu rol cambió')).toBeVisible();
    await page.getByText('Tu rol cambió').click();
    await page.keyboard.press('Escape');

    // Marking it read persists across a reload.
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(bellButton).not.toContainText('1');
  });
});
