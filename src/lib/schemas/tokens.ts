import { z } from 'zod';

export const createTokenSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(100),
});

export const createPublicLinkSchema = z.object({
  title: z.string().trim().min(1, 'title is required'),
  destination_url: z.url('destination_url must be a valid URL'),
  short_code: z.string().trim().min(1).optional(),
});
