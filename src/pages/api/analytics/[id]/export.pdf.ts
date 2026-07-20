import type { APIRoute } from 'astro';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { fetchLinkAnalytics } from '@/lib/analytics';

export const GET: APIRoute = async ({ params, url, locals }) => {
  if (!locals.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // RLS scopes this to owner-or-superadmin, same as the analytics page itself.
  const { data: link } = await locals.supabase
    .from('links')
    .select('id, title, short_code, destination_url')
    .eq('id', params.id)
    .single();

  if (!link) {
    return new Response('Not found', { status: 404 });
  }

  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const fromIso = from ? new Date(from).toISOString() : null;
  const toIso = to ? new Date(`${to}T23:59:59.999Z`).toISOString() : null;

  const stats = await fetchLinkAnalytics(locals.supabase, params.id!, fromIso, toIso);

  // pdf-lib is pure JS and runs fine on Workers — no Puppeteer/native canvas.
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4, in points
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const drawLine = (text: string, options: { size?: number; useBold?: boolean; gap?: number } = {}) => {
    const { size = 11, useBold = false, gap = 18 } = options;
    page.drawText(text, { x: 50, y, size, font: useBold ? bold : font, color: rgb(0.1, 0.1, 0.1) });
    y -= gap;
  };

  drawLine(`Reporte de analíticas: ${link.title}`, { size: 18, useBold: true, gap: 26 });
  drawLine(`Código: ${link.short_code}`, { size: 10 });
  drawLine(`Destino: ${link.destination_url}`, { size: 10 });
  if (from || to) drawLine(`Rango: ${from || '(inicio)'} — ${to || '(hoy)'}`, { size: 10 });
  y -= 10;

  drawLine('Resumen', { size: 14, useBold: true, gap: 20 });
  drawLine(`Clics totales: ${stats.total}`);
  drawLine(`Clics únicos: ${stats.unique}`);
  y -= 10;

  const drawBreakdown = (title: string, items: { label: string; clicks: number }[]) => {
    drawLine(title, { size: 13, useBold: true, gap: 18 });
    if (items.length === 0) {
      drawLine('Sin datos.', { size: 10 });
    } else {
      items.slice(0, 8).forEach((item) => drawLine(`${item.label}: ${item.clicks}`, { size: 10, gap: 15 }));
    }
    y -= 8;
  };

  drawBreakdown('Por país', stats.byCountry);
  drawBreakdown('Por dispositivo', stats.byDevice);
  drawBreakdown('Por referrer', stats.byReferrer);

  const pdfBytes = await pdfDoc.save();

  return new Response(pdfBytes.slice().buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="analytics-${link.short_code}.pdf"`,
    },
  });
};
