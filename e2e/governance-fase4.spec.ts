import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { test, expect } from '@playwright/test';
import { goToSuperadminDashboard, login } from './helpers';

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

// Supabase's free-tier mailer has a strict, account-wide send-rate limit —
// exercising invite/reset-password enough times in one test session
// exhausts it, so the fixture user this test needs is created directly via
// the Admin API (createUser never sends an email) instead of going through
// the app's own rate-limited invite flow.
let fixtureEmail: string;

test.beforeAll(async () => {
  const vars = loadDevVars();
  const admin = createClient(vars.SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  fixtureEmail = `fase4-e2e-${Date.now()}@example.com`;
  const { error } = await admin.auth.admin.createUser({
    email: fixtureEmail,
    password: `Fixture-${Date.now()}!`,
    email_confirm: true,
  });
  if (error) throw error;
});

test.describe('governance (Fase 4)', () => {
  test('self-service profile, departments, role/department assignment, suspend, and audit log', async ({ page }) => {
    await login(page);

    // Self-service profile: editing lives behind the pencil icon on the
    // profile header card, not an always-visible form.
    await page.goto('/admin/profile');
    await page.waitForLoadState('networkidle');
    const fullName = `Test Admin ${Date.now()}`;
    await page.getByRole('button', { name: 'Editar perfil' }).click();
    await page.fill('#full_name', fullName);
    await page.click('button:has-text("Guardar cambios")');
    await expect(page.getByText('Perfil actualizado')).toBeVisible();
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: fullName })).toBeVisible();

    // Superadmin dashboard: create a department
    await goToSuperadminDashboard(page);
    const deptName = `Dept ${Date.now()}`;
    await page.fill('input[placeholder="Nuevo departamento"]', deptName);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/departments')),
      page.click('button:has-text("Crear")'),
    ]);

    // Bulk invite: validate an obviously-malformed row without depending on a
    // real send succeeding (see the rate-limit note above) — this exercises
    // the real parsing/validation/partial-failure-reporting path end to end.
    await page.click('button:has-text("Invitar por CSV")');
    await page.setInputFiles('#bulk-invite-file', {
      name: 'invite.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('email\nnot-an-email'),
    });
    await page.click('button:has-text("Enviar invitaciones")');
    await expect(page.getByText('formato de correo inválido')).toBeVisible();
    await page.keyboard.press('Escape');

    const row = page.locator('table tbody tr', { hasText: fixtureEmail });
    await expect(row).toBeVisible();

    // Assign role and department
    await row.getByRole('combobox', { name: 'Rol' }).click();
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/update-role')),
      page.getByRole('option', { name: 'manager', exact: true }).click(),
    ]);
    await row.getByRole('combobox', { name: 'Departamento' }).click();
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/update-department')),
      page.getByRole('option', { name: deptName, exact: true }).click(),
    ]);

    // Persisted after reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    const reloadedRow = page.locator('table tbody tr', { hasText: fixtureEmail });
    await expect(reloadedRow.getByRole('combobox', { name: 'Rol' })).toContainText('manager');
    await expect(reloadedRow.getByRole('combobox', { name: 'Departamento' })).toContainText(deptName);

    // Suspend, then reactivate
    await reloadedRow.getByRole('button', { name: 'Acciones' }).click();
    await page.getByRole('menuitem', { name: 'Suspender' }).click();
    await expect(page.getByText('Usuario suspendido')).toBeVisible();
    await expect(reloadedRow.getByText('Suspendido')).toBeVisible();

    await reloadedRow.getByRole('button', { name: 'Acciones' }).click();
    await page.getByRole('menuitem', { name: 'Reactivar' }).click();
    await expect(page.getByText('Usuario reactivado')).toBeVisible();
    await expect(reloadedRow.getByText('Activo')).toBeVisible();

    // Reset password: only asserts that the action completes and surfaces
    // *some* new toast — not its exact wording — since Supabase's response
    // here varies with account state (free-tier send-rate limit, or email
    // format validation on a @example.com fixture address) independently of
    // whether this feature's own code is correct.
    const toastCountBefore = await page.getByRole('listitem').count();
    await reloadedRow.getByRole('button', { name: 'Acciones' }).click();
    await page.getByRole('menuitem', { name: 'Restablecer contraseña' }).click();
    await expect(page.getByRole('listitem')).toHaveCount(toastCountBefore + 1);

    // Audit log records the role change and both suspension events
    await page.getByRole('tab', { name: 'Auditoría' }).click();
    await expect(page.getByText('Cambio de rol').first()).toBeVisible();
    await expect(page.getByText('Usuario suspendido').first()).toBeVisible();
    await expect(page.getByText('Usuario reactivado').first()).toBeVisible();
  });
});
