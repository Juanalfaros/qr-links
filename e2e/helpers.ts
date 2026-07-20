import { createHmac } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

export const EMAIL = process.env.E2E_TEST_EMAIL ?? 'test@qrgyg.local';
export const PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'TestPassword123!';

// Turnstile's own script keeps background network activity going on the
// login page, so waitForLoadState('networkidle') never resolves there (unlike
// every other page in this app). Filling the React-controlled email/password
// inputs before the client:load island hydrates sets the DOM value directly
// without onChange firing, so React's internal state stays empty — the next
// re-render (triggered once Turnstile resolves and calls setCaptchaToken)
// then overwrites the DOM back to that stale empty value.
async function waitForHydration(page: Page) {
  // LoginForm's useEffect (inside its child Turnstile component) injects
  // this <script> tag — its presence proves React has hydrated and committed
  // for this island (event listeners attach as part of that same commit),
  // which a blind timeout wouldn't actually guarantee.
  await page.waitForFunction(() => document.querySelector('script[src*="challenges.cloudflare.com"]') !== null, {
    timeout: 10_000,
  });
}

export async function login(page: Page, email: string = EMAIL, password: string = PASSWORD) {
  await page.goto('/login');
  await waitForHydration(page);
  await page.fill('#email', email);
  await page.fill('#password', password);
  // Turnstile's managed-mode auto-solve can take a few seconds; the submit
  // button stays disabled until captchaToken arrives.
  await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 20_000 });
  await expect(page.locator('#email')).toHaveValue(email);
  await expect(page.locator('#password')).toHaveValue(password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard');
  await page.waitForLoadState('networkidle');
}

// --- Fase 6: TOTP 2FA, required for every /superadmin/* page -------------
//
// RFC 6238 TOTP, hand-rolled instead of adding a dependency for ~30 lines of
// well-specified math: base32-decode the shared secret, HMAC-SHA1 it with
// the 30-second time counter, then the standard dynamic-truncation step.
// Matches Supabase's own TOTP enrollment defaults (SHA1, 30s step, 6 digits).
function base32Decode(base32: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of base32.toUpperCase().replace(/=+$/, '')) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTotp(secretBase32: string, timeStep = 30, digits = 6, atMs = Date.now()): string {
  const key = base32Decode(secretBase32);
  const counter = Math.floor(atMs / 1000 / timeStep);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (binary % 10 ** digits).toString().padStart(digits, '0');
}

const TOTP_SECRET_FILE = path.resolve(process.cwd(), '.e2e-totp-secret');

function readPersistedTotpSecret(): string | null {
  if (!existsSync(TOTP_SECRET_FILE)) return null;
  return readFileSync(TOTP_SECRET_FILE, 'utf-8').trim() || null;
}

// Submits a fresh code each attempt (challengeAndVerify issues a new
// challenge every call) so this naturally recovers if a code lands right at
// a 30-second window boundary and Supabase rejects it as already-used.
//
// The per-attempt URL wait is intentionally generous (12s, not a few seconds):
// on a *successful* verification the browser redirects to /superadmin/dashboard,
// which SSRs the heaviest page in the app (~10 Supabase queries). Under real
// network latency that navigation can take several seconds to commit, and if
// the wait is too short it expires mid-navigation — the retry then can't find
// #mfa-code (already navigated away) and the whole loop wedges. 12s comfortably
// clears a slow-but-successful load while staying well under the 30s TOTP
// window, so a genuinely rejected code still gets retried within the budget.
async function submitTotpCode(page: Page, secret: string, submitButtonText: string) {
  await expect(async () => {
    await page.fill('#mfa-code', generateTotp(secret));
    await page.click(`button:has-text("${submitButtonText}")`);
    await expect(page).toHaveURL(/\/superadmin\/dashboard/, { timeout: 12_000 });
  }).toPass({ timeout: 48_000 });
}

// Navigates to /superadmin/dashboard and drives whatever 2FA step the
// middleware requires: first-ever visit enrolls a fresh TOTP factor
// (persisting its secret locally so future runs can compute valid codes —
// Supabase only reveals a factor's secret once, at enrollment time);
// subsequent visits just challenge the existing factor.
export async function goToSuperadminDashboard(page: Page) {
  await page.goto('/superadmin/dashboard');
  await page.waitForLoadState('networkidle');

  if (page.url().includes('/superadmin/mfa-setup')) {
    const secretParagraph = await page.getByText('O ingresa manualmente:').innerText();
    const secret = secretParagraph.replace('O ingresa manualmente:', '').trim();
    writeFileSync(TOTP_SECRET_FILE, secret, 'utf-8');
    await submitTotpCode(page, secret, 'Activar 2FA');
    // The page that just landed on /superadmin/dashboard is a fresh
    // navigation with its own client:load island — wait for it to settle
    // before the caller starts interacting, same reasoning as login().
    await page.waitForLoadState('networkidle');
    return;
  }

  if (page.url().includes('/superadmin/mfa-verify')) {
    const secret = readPersistedTotpSecret();
    if (!secret) {
      throw new Error(
        `MFA verification required for ${EMAIL} but no secret is persisted at ${TOTP_SECRET_FILE} — ` +
          'if the factor was reset in Supabase, delete this file and re-run so it can enroll fresh.',
      );
    }
    await submitTotpCode(page, secret, 'Continuar');
    await page.waitForLoadState('networkidle');
    return;
  }

  // Already at aal2 (e.g. session cookie carried over) — nothing to do.
}
