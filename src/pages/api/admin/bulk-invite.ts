import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import Papa from 'papaparse';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// Untrusted upload — papaparse handles quoted/escaped fields correctly, which
// a hand-rolled split(',') would get wrong on real-world exports.
const MAX_ROWS = 200;

export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'superadmin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'Se requiere un archivo CSV' }), { status: 400 });
  }

  const text = await file.text();
  // delimiter is pinned to ',' — with a single "email" column and no commas
  // anywhere in the file, papaparse's auto-detection has nothing to go on and
  // reports an "UndetectableDelimiter" error even though comma (the only
  // delimiter we ask users for) parses it just fine.
  const { data, errors } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: ',',
  });

  if (errors.length > 0) {
    return new Response(JSON.stringify({ error: `El CSV no se pudo leer: ${errors[0].message}` }), { status: 400 });
  }

  if (data.length === 0) {
    return new Response(JSON.stringify({ error: 'El CSV no tiene una columna "email" con datos' }), { status: 400 });
  }

  if (data.length > MAX_ROWS) {
    return new Response(JSON.stringify({ error: `Máximo ${MAX_ROWS} filas por carga` }), { status: 400 });
  }

  const admin = createSupabaseAdminClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const invited: { id: string; email: string }[] = [];
  const failed: { email: string; error: string }[] = [];

  for (const row of data) {
    const rawEmail = row.email?.trim() ?? '';
    const parsedEmail = z.email().safeParse(rawEmail);
    if (!parsedEmail.success) {
      failed.push({ email: rawEmail, error: 'formato de correo inválido' });
      continue;
    }

    const { data: userData, error } = await admin.auth.admin.inviteUserByEmail(parsedEmail.data, {
      redirectTo: `${env.PUBLIC_SITE_URL}/login`,
    });

    if (error || !userData.user.email) {
      failed.push({ email: parsedEmail.data, error: error?.message ?? 'error desconocido' });
    } else {
      invited.push({ id: userData.user.id, email: userData.user.email });
    }
  }

  return new Response(JSON.stringify({ invited, failed }), { status: 200 });
};
