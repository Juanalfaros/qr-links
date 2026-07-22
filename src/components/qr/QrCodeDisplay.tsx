import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download04Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { siteConfig } from '@/lib/config';
import { appendQrSourceParam } from '@/lib/qr';

interface QrCodeDisplayProps {
  value: string;
  size?: number;
  logoUrl: string | null;
}

// Print-friendly presets at ~300dpi, alongside the screen default.
const SIZE_PRESETS = [
  { label: 'Pantalla', value: siteConfig.qr.defaultSize },
  { label: 'Etiqueta 3×3cm', value: 354 },
  { label: 'Póster 10×10cm', value: 1181 },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function QrCodeDisplay({ value, size: initialSize = siteConfig.qr.defaultSize, logoUrl }: QrCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(initialSize);
  const [darkColor, setDarkColor] = useState('#000000');
  const [lightColor, setLightColor] = useState('#ffffff');
  const [includeLogo, setIncludeLogo] = useState(false);
  const [includeFrame, setIncludeFrame] = useState(false);

  const encodedValue = appendQrSourceParam(value);
  const framePadding = includeFrame ? Math.round(size * 0.18) : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    (async () => {
      const total = size + framePadding * 2;
      canvas.width = total;
      canvas.height = total;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = lightColor;
      ctx.fillRect(0, 0, total, total);

      const qrCanvas = document.createElement('canvas');
      // A logo covers the center, so bump error correction to 'H' (30%
      // recoverable) — otherwise scanners can fail on the obscured modules.
      await QRCode.toCanvas(qrCanvas, encodedValue, {
        width: size,
        margin: siteConfig.qr.margin,
        errorCorrectionLevel: includeLogo ? 'H' : 'M',
        color: { dark: darkColor, light: lightColor },
      });
      if (cancelled) return;
      ctx.drawImage(qrCanvas, framePadding, framePadding);

      if (includeLogo && logoUrl) {
        const logo = new Image();
        await new Promise<void>((resolve) => {
          logo.onload = () => resolve();
          logo.onerror = () => resolve();
          logo.src = logoUrl;
        });
        if (cancelled || logo.naturalWidth === 0) return;
        const logoSize = size * 0.22;
        const logoX = framePadding + (size - logoSize) / 2;
        const logoY = framePadding + (size - logoSize) / 2;
        ctx.fillStyle = lightColor;
        ctx.fillRect(logoX - 6, logoY - 6, logoSize + 12, logoSize + 12);
        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
      }

      if (includeFrame) {
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = Math.max(2, framePadding * 0.06);
        ctx.strokeRect(framePadding * 0.3, framePadding * 0.3, total - framePadding * 0.6, total - framePadding * 0.6);
        ctx.fillStyle = darkColor;
        ctx.font = `bold ${Math.round(framePadding * 0.45)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('ESCANÉAME', total / 2, total - framePadding * 0.35);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [encodedValue, size, darkColor, lightColor, includeLogo, includeFrame, framePadding, logoUrl]);

  const handleDownloadPng = () => {
    const dataUrl = canvasRef.current?.toDataURL('image/png');
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'qr-code.png';
    link.click();
  };

  const handleDownloadSvg = async () => {
    // SVG export is the plain colored QR only — logo/frame overlays are a
    // canvas-only compositing step, not worth reproducing in hand-built SVG.
    const svgMarkup = await QRCode.toString(encodedValue, {
      type: 'svg',
      width: size,
      margin: siteConfig.qr.margin,
      color: { dark: darkColor, light: lightColor },
    });
    downloadBlob(new Blob([svgMarkup], { type: 'image/svg+xml' }), 'qr-code.svg');
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas ref={canvasRef} className="max-w-full rounded-md" style={{ width: 240, height: 240 }} />
      <p className="text-muted-foreground text-center text-xs break-all">{value}</p>

      <details className="group w-full">
        <summary className="text-muted-foreground hover:bg-muted hover:text-foreground -mx-2 flex w-fit cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium transition-colors select-none marker:content-none">
          Personalizar
          <HugeiconsIcon icon={ArrowDown01Icon} size={14} className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="qr-size">Tamaño</Label>
            <select
              id="qr-size"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="border-input h-8 rounded-lg border bg-transparent px-2 text-sm"
            >
              {SIZE_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label} ({preset.value}px)
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="qr-dark">Color</Label>
              <input
                id="qr-dark"
                type="color"
                value={darkColor}
                onChange={(e) => setDarkColor(e.target.value)}
                className="h-8 w-14"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="qr-light">Fondo</Label>
              <input
                id="qr-light"
                type="color"
                value={lightColor}
                onChange={(e) => setLightColor(e.target.value)}
                className="h-8 w-14"
              />
            </div>
          </div>
          {logoUrl && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeLogo} onChange={(e) => setIncludeLogo(e.target.checked)} />
              Incluir logo de la empresa
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeFrame} onChange={(e) => setIncludeFrame(e.target.checked)} />
            Marco &ldquo;Escanéame&rdquo;
          </label>
        </div>
      </details>

      <div className="flex gap-2">
        <Button onClick={handleDownloadPng} variant="secondary" size="sm">
          <HugeiconsIcon icon={Download04Icon} size={16} />
          PNG
        </Button>
        <Button onClick={handleDownloadSvg} variant="secondary" size="sm">
          <HugeiconsIcon icon={Download04Icon} size={16} />
          SVG
        </Button>
      </div>
    </div>
  );
}
