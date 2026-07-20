import { z } from 'zod';

export const createTagSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(50, 'name is too long'),
});

export const setLinkTagsSchema = z.object({
  tagIds: z.array(z.string().trim().min(1)),
});
