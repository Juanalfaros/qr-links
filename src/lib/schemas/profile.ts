import { z } from 'zod';

export const updateProfileSchema = z.object({
  full_name: z.string().trim().max(200).nullable(),
  avatar_url: z.string().trim().max(2048).nullable(),
});

// Client-side only (see ChangePasswordDialog) — there's no server route for
// this, so this schema just keeps validation/error-message shape consistent
// with the rest of the app before calling Supabase Auth directly.
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'currentPassword is required'),
  newPassword: z.string().min(12, 'newPassword must be at least 12 characters'),
});
