import type { APIRoute } from 'astro';
import Papa from 'papaparse';
import { generateShortCode } from '@/lib/short-code';
import { validateDestinationUrl } from '@/lib/url-validation';
import { siteConfig } from '@/lib/config';

// Untrusted upload — papaparse handles quoted/escaped fields correctly, which
// a hand-rolled split(',') would get wrong on real-world exports. Bitly's own
// CSV export always has a "long_url" column and usually a "title" one; other
// columns (short link, tags, archived...) are ignored.
const MAX_ROWS = 200;

interface BitlyRow {
  long_url?: string;
  title?: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'Se requiere un archivo CSV' }), { status: 400 });
  }

  const text = await file.text();
  const { data, errors } = Papa.parse<BitlyRow>(text, { header: true, skipEmptyLines: true });

  if (errors.length > 0) {
    return new Response(JSON.stringify({ error: `El CSV no se pudo leer: ${errors[0].message}` }), { status: 400 });
  }
  if (data.length === 0) {
    return new Response(JSON.stringify({ error: 'El CSV no tiene una columna "long_url" con datos' }), {
      status: 400,
    });
  }
  if (data.length > MAX_ROWS) {
    return new Response(JSON.stringify({ error: `Máximo ${MAX_ROWS} filas por carga` }), { status: 400 });
  }

  const imported: Record<string, unknown>[] = [];
  const failed: { long_url: string; error: string }[] = [];

  for (const row of data) {
    const longUrl = row.long_url?.trim() ?? '';
    if (!longUrl) {
      failed.push({ long_url: '', error: 'falta long_url' });
      continue;
    }

    const urlCheck = await validateDestinationUrl(locals.supabase, longUrl);
    if (!urlCheck.valid) {
      failed.push({ long_url: longUrl, error: urlCheck.error ?? 'URL inválida' });
      continue;
    }

    const { data: quotaOk, error: quotaError } = await locals.supabase.rpc('check_and_increment_link_quota', {
      p_user_id: locals.user.id,
      p_daily_limit: siteConfig.security.linksPerDayLimit,
    });
    if (quotaError || !quotaOk) {
      failed.push({ long_url: longUrl, error: 'límite diario de creación de links alcanzado' });
      continue;
    }

    const title = row.title?.trim() || longUrl;
    const short_code = generateShortCode();

    const { data: inserted, error } = await locals.supabase
      .from('links')
      .insert({ title, destination_url: longUrl, short_code, user_id: locals.user.id })
      .select()
      .single();

    if (error) {
      failed.push({ long_url: longUrl, error: error.message });
    } else {
      const { password_hash, ...linkWithoutHash } = inserted;
      imported.push({ ...linkWithoutHash, has_password: password_hash !== null });
    }
  }

  return new Response(JSON.stringify({ imported, failed }), { status: 200 });
};
