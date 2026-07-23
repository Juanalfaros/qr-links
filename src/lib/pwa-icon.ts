// Generates the 3 PWA manifest icon variants (192 "any", 512 "any", 512
// "maskable") client-side via <canvas> — Cloudflare Workers can't do image
// processing without a paid service, so this runs in the superadmin's own
// browser at upload time instead (see src/components/admin/BrandingManager.tsx
// and src/components/auth/SetupForm.tsx).

export interface IconLayout {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

// Contain-fit, centered: scales the source to fit within
// `targetSize * safeZoneRatio`, centered in the target square.
// safeZoneRatio=1 for a normal "any" icon (fills as much as possible);
// ~0.8 for "maskable" — Android's safe-zone convention keeps content within
// the center 80% so an OS-applied circular/squircle mask never clips it.
// Pure/no Canvas — unit-testable on its own.
export function computeIconLayout(
  sourceWidth: number,
  sourceHeight: number,
  targetSize: number,
  safeZoneRatio: number,
): IconLayout {
  const maxDim = targetSize * safeZoneRatio;
  const scale = Math.min(maxDim / sourceWidth, maxDim / sourceHeight);
  const dw = sourceWidth * scale;
  const dh = sourceHeight * scale;
  return {
    dx: (targetSize - dw) / 2,
    dy: (targetSize - dh) / 2,
    dw,
    dh,
  };
}

// Maskable icons must be fully opaque — a transparent background would show
// through the OS's circular/squircle mask as a "broken" hole.
const MASKABLE_BACKGROUND = '#ffffff';

function drawIcon(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  size: number,
  safeZoneRatio: number,
  background: string | null,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D no soportado');

  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
  }

  const { dx, dy, dw, dh } = computeIconLayout(sourceWidth, sourceHeight, size, safeZoneRatio);
  ctx.drawImage(source, dx, dy, dw, dh);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar el ícono'))), 'image/png');
  });
}

async function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface GeneratedIcons {
  icon192: Blob;
  icon512: Blob;
  icon512Maskable: Blob;
}

export async function generatePwaIcons(source: File | Blob): Promise<GeneratedIcons> {
  const img = await loadImage(source);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const [icon192, icon512, icon512Maskable] = await Promise.all([
    drawIcon(img, w, h, 192, 1, null),
    drawIcon(img, w, h, 512, 1, null),
    drawIcon(img, w, h, 512, 0.8, MASKABLE_BACKGROUND),
  ]);
  return { icon192, icon512, icon512Maskable };
}
