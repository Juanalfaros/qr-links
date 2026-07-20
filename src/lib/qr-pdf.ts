import type { PDFPage } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import QRCode from 'qrcode';

// pdf-lib can't rasterize SVG or draw a <canvas>, so bulk PDF export uses
// QRCode.create()'s raw module matrix (a flat 0/1 array) and draws each dark
// module as its own filled rectangle — simpler and more robust than trying
// to reproduce the library's stroke-based SVG path output inside pdf-lib.
export function drawQrCode(page: PDFPage, value: string, x: number, y: number, size: number) {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const moduleCount = qr.modules.size;
  const data = qr.modules.data;
  const cellSize = size / moduleCount;

  page.drawRectangle({ x, y, width: size, height: size, color: rgb(1, 1, 1) });

  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (!data[row * moduleCount + col]) continue;
      page.drawRectangle({
        x: x + col * cellSize,
        y: y + size - (row + 1) * cellSize, // PDF's y-axis grows upward, unlike the module grid's
        width: cellSize,
        height: cellSize,
        color: rgb(0, 0, 0),
      });
    }
  }
}
