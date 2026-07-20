import type { APIRoute } from 'astro';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { env } from 'cloudflare:workers';
import { appendQrSourceParam } from '@/lib/qr';
import { drawQrCode } from '@/lib/qr-pdf';

const MAX_BATCH = 100;
const COLS = 3;
const ROWS = 4;
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842; // A4, in points
const MARGIN = 40;

export const GET: APIRoute = async ({ url, locals }) => {
  if (!locals.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const ids = url.searchParams.getAll('ids').filter(Boolean).slice(0, MAX_BATCH);
  if (ids.length === 0) {
    return new Response('No ids provided', { status: 400 });
  }

  const { data: links, error } = await locals.supabase.from('links').select('id, title, short_code').in('id', ids);
  if (error || !links || links.length === 0) {
    return new Response('No links found', { status: 404 });
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const cellWidth = (PAGE_WIDTH - MARGIN * 2) / COLS;
  const cellHeight = (PAGE_HEIGHT - MARGIN * 2) / ROWS;
  const qrSize = Math.min(cellWidth, cellHeight) * 0.65;
  const perPage = COLS * ROWS;

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  links.forEach((link, index) => {
    if (index > 0 && index % perPage === 0) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    }
    const posInPage = index % perPage;
    const col = posInPage % COLS;
    const row = Math.floor(posInPage / COLS);

    const cellX = MARGIN + col * cellWidth;
    const cellTop = PAGE_HEIGHT - MARGIN - row * cellHeight;
    const qrX = cellX + (cellWidth - qrSize) / 2;
    const qrY = cellTop - cellHeight * 0.75;

    const qrUrl = appendQrSourceParam(`${env.PUBLIC_SITE_URL}/${link.short_code}`);
    drawQrCode(page, qrUrl, qrX, qrY, qrSize);

    const label = link.title.length > 24 ? `${link.title.slice(0, 24)}…` : link.title;
    const textWidth = font.widthOfTextAtSize(label, 9);
    page.drawText(label, {
      x: cellX + (cellWidth - textWidth) / 2,
      y: qrY - 14,
      size: 9,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  });

  const pdfBytes = await pdfDoc.save();

  return new Response(pdfBytes.slice().buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="qr-codes.pdf"',
    },
  });
};
