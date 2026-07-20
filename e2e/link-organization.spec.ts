import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('link organization (Fase 1)', () => {
  test('pin, tag, search, duplicate, archive and restore a link', async ({ page }) => {
    await login(page);

    const title = `Fase1 test ${Date.now()}`;
    await page.click('button:has-text("Nuevo link")');
    await page.fill('#title', title);
    await page.fill('#destination_url', 'https://example.org');
    await page.click('button:has-text("Crear link")');
    await expect(page.getByText('SVG')).toBeVisible();
    await page.keyboard.press('Escape');

    const row = page.locator('table tbody tr', { hasText: title });
    await expect(row).toBeVisible();

    // Pin
    await row.getByRole('button', { name: /favorito/i }).click();
    await page.waitForTimeout(500);

    // Search filters down to just this link
    await page.fill('input[name="q"]', title);
    await page.click('button:has-text("Buscar")');
    await page.waitForLoadState('networkidle');
    const searchedRow = page.locator('table tbody tr', { hasText: title });
    await expect(searchedRow).toBeVisible();
    await expect(page.locator('table tbody tr')).toHaveCount(1);

    // Tag: open edit dialog, create + auto-assign a new tag
    await searchedRow.getByRole('button', { name: 'Acciones' }).click();
    await page.getByRole('menuitem', { name: 'Editar' }).click();
    const tagName = `tag-${Date.now()}`;
    await page.fill('input[placeholder="Nuevo tag"]', tagName);
    await page.getByRole('button', { name: 'Agregar tag' }).click();
    await expect(page.getByRole('button', { name: tagName })).toBeVisible();
    await page.waitForTimeout(500); // let the PUT to /tags persist
    await page.keyboard.press('Escape');

    // Tag badge shows up in the table row
    await expect(page.locator('table tbody tr', { hasText: title }).getByText(tagName)).toBeVisible();

    // Duplicate — target specifically the tagged row, since duplication prepends
    // a new (untagged) row and reorders the list.
    const taggedRow = page.locator('table tbody tr', { hasText: title }).filter({ hasText: tagName });
    await taggedRow.getByRole('button', { name: 'Acciones' }).click();
    await page.getByRole('menuitem', { name: 'Duplicar' }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('table tbody tr', { hasText: title })).toHaveCount(2);

    // Archive the original (tagged) row and confirm it leaves the active list
    await taggedRow.getByRole('button', { name: 'Acciones' }).click();
    await page.getByRole('menuitem', { name: 'Eliminar' }).click();
    await page.getByRole('button', { name: 'Eliminar' }).last().click();
    await page.waitForTimeout(500);

    // Switch to the Archivados tab and confirm it's there, then restore it
    await page.click('a:has-text("Archivados")');
    await page.waitForLoadState('networkidle');
    const archivedRow = page.locator('table tbody tr', { hasText: title });
    await expect(archivedRow).toBeVisible();
    await archivedRow.getByRole('button', { name: 'Restaurar' }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('table tbody tr', { hasText: title })).toHaveCount(0);
  });
});
