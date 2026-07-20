import { z } from 'zod';

export const markNotificationReadSchema = z.object({
  id: z.string().trim().min(1).optional(),
  markAll: z.boolean().optional(),
});
