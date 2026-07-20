import type { APIRoute } from 'astro';
import { zipSync, strToU8 } from 'fflate';
import QRCode from 'qrcode';
import { env } from 'cloudflare:workers';
import { appendQrSourceParam } from '@/lib/qr';

// Keeps a single synchronous Worker request from generating an unbounded
// number of QR codes — matches the picker page's own cap.
const MAX_BATCH = 100;

export const GET: APIRoute = async ({ url, locals }) => {
  if (!locals.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const ids = url.searchParams.getAll('ids').filter(Boolean).slice(0, MAX_BATCH);
  if (ids.length === 0) {
    return new Response('No ids provided', { status: 400 });
  }

  // RLS scopes this to owner-or-superadmin; ids the caller doesn't own are
  // silently dropped, same as everywhere else this pattern is used.
  const { data: links, error } = await locals.supabase.from('links').select('id, short_code').in('id', ids);
  if (error || !links || links.length === 0) {
    return new Response('No links found', { status: 404 });
  }

  const files: Record<string, Uint8Array> = {};
  for (const link of links) {
    const qrUrl = appendQrSourceParam(`${env.PUBLIC_SITE_URL}/${link.short_code}`);
    const svg = await QRCode.toString(qrUrl, { type: 'svg', margin: 1 });
    files[`${link.short_code}.svg`] = strToU8(svg);
  }

  const zipped = zipSync(files);

  return new Response(zipped.slice().buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="qr-codes.zip"',
    },
  });
};
