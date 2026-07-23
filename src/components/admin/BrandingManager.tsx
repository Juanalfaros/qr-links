import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { rotateHue } from '@/lib/theme';
import type { Branding } from '@/lib/branding';

interface BrandingManagerProps {
  initialBranding: Branding;
}

// Only used while the hue slider is shown but the superadmin hasn't dragged
// it yet — matches accent-blue's own hue, i.e. the identity/no-op value.
const DEFAULT_PREVIEW_HUE = 245;

const RADIUS_ITEMS = {
  default: 'Predeterminado',
  '0': 'Ninguno',
  '0.5': 'Sutil',
  '0.9': 'Estándar',
  '1.4': 'Redondeado',
  '2': 'Muy redondeado',
};

const SIDEBAR_STYLE_ITEMS = {
  default: 'Oscuro (predeterminado)',
  brand: 'Color de marca',
};

// A handful of representative tokens (light-mode L/C + base hue) used only
// to render a live preview strip here, without duplicating global.css's
// full token table — src/lib/theme.ts's rotateHue is the same formula
// actually applied when the page renders.
const PREVIEW_SWATCHES: { label: string; l: number; c: number; baseHue: number; direct: boolean }[] = [
  { label: 'Principal', l: 0.78, c: 0.09, baseHue: 85, direct: true },
  { label: 'Amarillo', l: 0.92, c: 0.11, baseHue: 95, direct: false },
  { label: 'Rosa', l: 0.9, c: 0.07, baseHue: 350, direct: false },
  { label: 'Verde', l: 0.9, c: 0.08, baseHue: 145, direct: false },
  { label: 'Azul', l: 0.9, c: 0.06, baseHue: 245, direct: false },
  { label: 'Lila', l: 0.9, c: 0.06, baseHue: 300, direct: false },
];

function radiusToKey(radiusRem: number | null): string {
  return radiusRem === null ? 'default' : String(radiusRem);
}

function keyToRadius(key: string): number | null {
  return key === 'default' ? null : Number(key);
}

export function BrandingManager({ initialBranding }: BrandingManagerProps) {
  const [currentLogoUrl, setCurrentLogoUrl] = useState(initialBranding.logoUrl);
  const [currentFaviconUrl, setCurrentFaviconUrl] = useState(initialBranding.faviconUrl);
  const [name, setName] = useState(initialBranding.name);
  const [tokenPrefix, setTokenPrefix] = useState(initialBranding.tokenPrefix);
  const [logo, setLogo] = useState<File | null>(null);
  const [favicon, setFavicon] = useState<File | null>(null);
  const [customizeHue, setCustomizeHue] = useState(initialBranding.hue !== null);
  const [hue, setHue] = useState(initialBranding.hue ?? DEFAULT_PREVIEW_HUE);
  const [radiusRem, setRadiusRem] = useState<number | null>(initialBranding.radiusRem);
  const [sidebarStyle, setSidebarStyle] = useState<'dark' | 'brand' | null>(initialBranding.sidebarStyle);
  const [qrDarkColor, setQrDarkColor] = useState(initialBranding.qrDarkColor);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('tokenPrefix', tokenPrefix);
    if (logo) formData.append('logo', logo);
    if (favicon) formData.append('favicon', favicon);
    formData.append('hue', customizeHue ? String(hue) : '');
    formData.append('radiusRem', radiusRem === null ? '' : String(radiusRem));
    formData.append('sidebarStyle', sidebarStyle ?? '');
    formData.append('qrDarkColor', qrDarkColor ?? '');

    const res = await fetch('/api/admin/branding', { method: 'PATCH', body: formData });
    const body = (await res.json().catch(() => ({}))) as Partial<{
      name: string;
      logoUrl: string | null;
      faviconUrl: string | null;
      tokenPrefix: string;
      hue: number | null;
      radiusRem: number | null;
      sidebarStyle: 'dark' | 'brand' | null;
      qrDarkColor: string | null;
      error: string;
    }>;

    if (!res.ok) {
      toast.error(body.error ?? 'No se pudo actualizar el branding');
      setLoading(false);
      return;
    }

    setCurrentLogoUrl(body.logoUrl ?? currentLogoUrl);
    setCurrentFaviconUrl(body.faviconUrl ?? currentFaviconUrl);
    setTokenPrefix(body.tokenPrefix ?? tokenPrefix);
    setLogo(null);
    setFavicon(null);
    setLoading(false);
    toast.success('Branding actualizado. Recargá la página para ver los cambios de apariencia.');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Branding</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="branding-name">Nombre de la empresa</Label>
            <Input id="branding-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="branding-token-prefix">Prefijo de tokens de API</Label>
            <Input
              id="branding-token-prefix"
              required
              value={tokenPrefix}
              onChange={(e) => setTokenPrefix(e.target.value)}
              placeholder="api_"
              className="font-mono"
            />
            <p className="text-muted-foreground text-xs">
              Solo minúsculas, números y guion bajo, terminando en "_" (ej: acme_). Los tokens ya emitidos no se ven
              afectados.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="branding-logo">Logo</Label>
              {currentLogoUrl && !logo && (
                <div className="flex items-center gap-2">
                  <img src={currentLogoUrl} alt="" className="size-10 rounded-lg bg-white object-contain p-1" />
                  <span className="text-muted-foreground text-xs">Logo actual</span>
                </div>
              )}
              <FileDropzone
                id="branding-logo"
                accept="image/png,image/jpeg"
                file={logo}
                onFileChange={setLogo}
                validateAsBrandingImage
                hint="Arrastra un archivo para reemplazarlo"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="branding-favicon">Favicon</Label>
              {currentFaviconUrl && !favicon && (
                <div className="flex items-center gap-2">
                  <img src={currentFaviconUrl} alt="" className="size-10 rounded-lg bg-white object-contain p-1" />
                  <span className="text-muted-foreground text-xs">Favicon actual</span>
                </div>
              )}
              <FileDropzone
                id="branding-favicon"
                accept="image/png,image/x-icon"
                file={favicon}
                onFileChange={setFavicon}
                validateAsBrandingImage
                hint="Arrastra un archivo para reemplazarlo"
              />
            </div>
          </div>

          <div className="border-border flex flex-col gap-4 border-t pt-4">
            <h3 className="text-sm font-medium">Apariencia</h3>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={customizeHue} onChange={(e) => setCustomizeHue(e.target.checked)} />
                Personalizar color de marca
              </label>
              {customizeHue && (
                <>
                  <input
                    type="range"
                    min={0}
                    max={359}
                    value={hue}
                    onChange={(e) => setHue(Number(e.target.value))}
                    aria-label="Tono de color de marca"
                    className="accent-primary"
                  />
                  <div className="flex gap-3">
                    {PREVIEW_SWATCHES.map((swatch) => (
                      <div key={swatch.label} className="flex flex-col items-center gap-1">
                        <div
                          className="ring-foreground/10 size-8 rounded-full ring-1"
                          style={{
                            backgroundColor: `oklch(${swatch.l} ${swatch.c} ${
                              swatch.direct ? hue : rotateHue(swatch.baseHue, hue)
                            })`,
                          }}
                        />
                        <span className="text-muted-foreground text-[10px]">{swatch.label}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="branding-radius">Redondeo de esquinas</Label>
              <Select
                value={radiusToKey(radiusRem)}
                items={RADIUS_ITEMS}
                onValueChange={(v) => setRadiusRem(keyToRadius(v as string))}
              >
                <SelectTrigger id="branding-radius" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RADIUS_ITEMS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="branding-sidebar-style">Estilo del menú lateral</Label>
              <Select
                value={sidebarStyle ?? 'default'}
                items={SIDEBAR_STYLE_ITEMS}
                onValueChange={(v) => setSidebarStyle(v === 'default' ? null : 'brand')}
              >
                <SelectTrigger id="branding-sidebar-style" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SIDEBAR_STYLE_ITEMS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="branding-qr-color">Color de QR por defecto</Label>
              <div className="flex items-center gap-2">
                <input
                  id="branding-qr-color"
                  type="color"
                  value={qrDarkColor ?? '#000000'}
                  onChange={(e) => setQrDarkColor(e.target.value)}
                  className="size-8 cursor-pointer rounded border"
                />
                <button
                  type="button"
                  onClick={() => setQrDarkColor(null)}
                  className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
                >
                  Restablecer a negro
                </button>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="self-start">
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
