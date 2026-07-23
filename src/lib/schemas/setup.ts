import { z } from 'zod';

// Kept separate from admin.ts: this is the one schema used by a route with
// no authentication guard at all (by definition — /api/setup runs before
// any account exists), worth keeping visually distinct from the
// superadmin-gated schemas in admin.ts. Files (logo/favicon) aren't part of
// this — they arrive as FormData entries validated separately in
// uploadBrandingAsset, not via zod.
export const setupSchema = z.object({
  email: z.email('El email debe ser válido'),
  password: z.string().min(12, 'La contraseña debe tener al menos 12 caracteres'),
  companyName: z.string().trim().min(1, 'El nombre de la empresa es obligatorio').max(120),
  // Optional/skippable brand hue picker (step 2 of the wizard) — see
  // src/lib/theme.ts. Omitted entirely leaves branding_settings.brand_hue at
  // its column default (null), same as never opening the appearance panel.
  hue: z.number().int().min(0).max(359).nullable().optional(),
});
