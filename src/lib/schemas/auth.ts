import { z } from 'zod';

// Kept separate from admin.ts: this is used by a route with no
// authentication guard (self-service "forgot password"), same reasoning as
// setup.ts being split out from admin.ts.
export const forgotPasswordSchema = z.object({
  email: z.email('email must be valid'),
  captchaToken: z.string().min(1, 'captchaToken is required'),
});
