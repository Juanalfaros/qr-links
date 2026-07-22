import { z } from 'zod';

// Kept separate from admin.ts: this is the one schema used by a route with
// no authentication guard at all (by definition — /api/setup runs before
// any account exists), worth keeping visually distinct from the
// superadmin-gated schemas in admin.ts. Files (logo/favicon) aren't part of
// this — they arrive as FormData entries validated separately in
// uploadBrandingAsset, not via zod.
export const setupSchema = z.object({
  email: z.email('email must be valid'),
  password: z.string().min(12, 'password must be at least 12 characters'),
  companyName: z.string().trim().min(1, 'companyName is required').max(120),
});
