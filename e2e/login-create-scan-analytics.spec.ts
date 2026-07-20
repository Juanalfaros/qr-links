import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('core link lifecycle', () => {
  test('login, create, edit, view QR, delete, and confirm redirect stops', async ({ page, request }) => {
    await login(page);

    const title = `E2E test link ${Date.now()}`;
    await page.click('button:has-text("Nuevo link")');
    await page.fill('#title', title);
    await page.fill('#destination_url', 'https://example.com');
    await page.click('button:has-text("Crear link")');
    await expect(page.getByText('SVG')).toBeVisible();
    await page.keyboard.press('Escape');

    const row = page.locator('table tbody tr', { hasText: title });
    await expect(row).toBeVisible();
    const shortCodeText = await row.locator('a[href^="/admin/analytics/"]').innerText();

    // Confirm the short link actually redirects while the link is active.
    const redirectRes = await request.get(`/${shortCodeText}`, { maxRedirects: 0 });
    expect(redirectRes.status()).toBe(302);
    expect(redirectRes.headers()['location']).toBe('https://example.com');

    // Edit
    await row.getByRole('button', { name: 'Acciones' }).click();
    await page.getByRole('menuitem', { name: 'Editar' }).click();
    const newTitle = `${title} (editado)`;
    await page.fill('#edit-title', newTitle);
    await page.click('button:has-text("Guardar cambios")');
    await expect(page.locator('table tbody tr', { hasText: newTitle })).toBeVisible();

    // Delete (soft) and confirm it disappears from the active list
    const editedRow = page.locator('table tbody tr', { hasText: newTitle });
    await editedRow.getByRole('button', { name: 'Acciones' }).click();
    await page.getByRole('menuitem', { name: 'Eliminar' }).click();
    await page.getByRole('button', { name: 'Eliminar' }).last().click();
    await expect(page.locator('table tbody tr', { hasText: newTitle })).toHaveCount(0);

    // The redirect must stop immediately once soft-deleted.
    const afterDeleteRes = await request.get(`/${shortCodeText}`, { maxRedirects: 0 });
    expect(afterDeleteRes.status()).toBe(404);
  });
});
