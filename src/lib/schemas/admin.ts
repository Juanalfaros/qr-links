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
  hue: z.number().int().min(0).max(359).nullable().optional(),
  radiusRem: z.number().min(0).max(2).nullable().optional(),
  sidebarStyle: z.enum(['dark', 'brand']).nullable().optional(),
  qrDarkColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-f]{6}$/i, 'qrDarkColor must look like #rrggbb')
    .nullable()
    .optional(),
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
