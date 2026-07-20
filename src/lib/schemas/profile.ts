import { z } from 'zod';

export const updateProfileSchema = z.object({
  full_name: z.string().trim().max(200).nullable(),
  avatar_url: z.string().trim().max(2048).nullable(),
});
