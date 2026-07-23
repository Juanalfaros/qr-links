import { z } from 'zod';

export const inviteUserSchema = z.object({
  email: z.email('email must be valid'),
});

export const updateRoleSchema = z.object({
  userId: z.string().trim().min(1, 'userId is required'),
  role: z.enum(['user', 'manager', 'superadmin']),
});

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
});

export const updateDepartmentSchema = z.object({
  userId: z.string().trim().min(1, 'userId is required'),
  departmentId: z.string().trim().min(1).nullable(),
});

export const suspendUserSchema = z.object({
  userId: z.string().trim().min(1, 'userId is required'),
  suspend: z.boolean(),
});

export const resetPasswordSchema = z.object({
  email: z.email('email must be valid'),
});

export const createAllowedDomainSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'domain is required')
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'domain must look like example.com'),
});

export const createBlockedPatternSchema = z.object({
  pattern: z.string().trim().toLowerCase().min(1, 'pattern is required'),
});

export const deleteByIdSchema = z.object({
  id: z.string().trim().min(1, 'id is required'),
});

// Reused for every hex-color appearance field below — native
// <input type="color"> always yields a lowercase 6-digit hex, but kept
// lenient (case/optional leading '#' don't matter, src/lib/theme.ts's
// hexToHue only cares about the digits) for any hand-typed value too.
const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#?[0-9a-f]{6}$/i, 'must look like #rrggbb');

export const updateBrandingSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  tokenPrefix: z
    .string()
    .trim()
    .min(1, 'tokenPrefix is required')
    .max(20, 'tokenPrefix must be at most 20 characters')
    .regex(/^[a-z0-9_]+_$/, 'tokenPrefix must be lowercase letters/numbers/underscores and end with "_"'),
  // All nullable+optional: null clears back to the hardcoded default,
  // omitted (undefined) leaves the column untouched — lets /api/setup send
  // only a subset (or none) of these without failing validation.
  primaryColor: hexColorSchema.nullable().optional(),
  accentColor: hexColorSchema.nullable().optional(),
  accentYellowColor: hexColorSchema.nullable().optional(),
  accentPinkColor: hexColorSchema.nullable().optional(),
  accentGreenColor: hexColorSchema.nullable().optional(),
  accentBlueColor: hexColorSchema.nullable().optional(),
  accentLilacColor: hexColorSchema.nullable().optional(),
  radiusRem: z.number().min(0).max(2).nullable().optional(),
  sidebarStyle: z.enum(['dark', 'brand']).nullable().optional(),
  qrDarkColor: hexColorSchema.nullable().optional(),
});

export const wipeDataSchema = z.object({
  confirmationPhrase: z.string().trim().min(1, 'confirmationPhrase is required'),
  password: z.string().min(1, 'password is required'),
});

export const createAlertRuleSchema = z.object({
  linkId: z.string().trim().min(1).nullable(),
  thresholdCount: z.number().int().positive(),
  windowHours: z
    .number()
    .int()
    .positive()
    .max(24 * 30),
  notifyEmail: z.email('notifyEmail must be valid'),
});
