import { z } from 'zod';

const protectionFields = {
  // Client converts empty inputs to `null` before sending — an empty string is
  // never valid here, only a real ISO datetime or an explicit `null` to clear it.
  expires_at: z.string().min(1).nullable(),
  max_clicks: z.number().int().positive().nullable(),
  // Plaintext password: `null` clears protection, a string (min 4 chars) sets a
  // new one, omitted means "leave unchanged". Hashed server-side via the
  // set_link_password RPC — the API route must never write this to a column.
  password: z.string().min(4, 'la contraseña debe tener al menos 4 caracteres').nullable(),
  show_interstitial: z.boolean(),
};

const integrationFields = {
  // Client converts an empty input to `null` before sending, same convention
  // as expires_at/max_clicks above.
  webhook_url: z.url('webhook_url must be a valid URL').nullable(),
  ga_tracking_id: z.string().trim().min(1).max(32).nullable(),
};

export const createLinkSchema = z
  .object({
    title: z.string().trim().min(1, 'title is required'),
    destination_url: z.url('destination_url must be a valid URL'),
    short_code: z.string().trim().min(1).optional(),
    ...protectionFields,
    ...integrationFields,
  })
  .partial({
    short_code: true,
    expires_at: true,
    max_clicks: true,
    password: true,
    show_interstitial: true,
    webhook_url: true,
    ga_tracking_id: true,
  });

export const updateLinkSchema = z
  .object({
    title: z.string().trim().min(1, 'title is required'),
    destination_url: z.url('destination_url must be a valid URL'),
    is_pinned: z.boolean(),
    // Only `null` (restore) is accepted here — archiving goes through DELETE instead,
    // so this route can never be used to set an arbitrary deleted_at timestamp.
    deleted_at: z.null(),
    ...protectionFields,
    ...integrationFields,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'at least one field must be provided');
