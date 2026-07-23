import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColorField } from '@/components/ui/color-field';
import { ThemePreview } from '@/components/admin/ThemePreview';
import { defaultPrimaryHex, defaultAccentHex, defaultAccentFamilyHex } from '@/lib/theme';
import type { Branding } from '@/lib/branding';

interface BrandingManagerProps {
  initialBranding: Branding;
}

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

const ACCENT_OVERRIDE_LABELS: Record<'yellow' | 'pink' | 'green' | 'blue' | 'lilac', string> = {
  yellow: 'Amarillo',
  pink: 'Rosa',
  green: 'Verde',
  blue: 'Azul',
  lilac: 'Lila',
};

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
  const [primaryColor, setPrimaryColor] = useState(initialBranding.primaryColor);
  const [accentColor, setAccentColor] = useState(initialBranding.accentColor);
  const [accentYellowColor, setAccentYellowColor] = useState(initialBranding.accentYellowColor);
  const [accentPinkColor, setAccentPinkColor] = useState(initialBranding.accentPinkColor);
  const [accentGreenColor, setAccentGreenColor] = useState(initialBranding.accentGreenColor);
  const [accentBlueColor, setAccentBlueColor] = useState(initialBranding.accentBlueColor);
  const [accentLilacColor, setAccentLilacColor] = useState(initialBranding.accentLilacColor);
  const [radiusRem, setRadiusRem] = useState<number | null>(initialBranding.radiusRem);
  const [sidebarStyle, setSidebarStyle] = useState<'dark' | 'brand' | null>(initialBranding.sidebarStyle);
  const [qrDarkColor, setQrDarkColor] = useState(initialBranding.qrDarkColor);
  const [loading, setLoading] = useState(false);

  const accentOverrideFields: [keyof typeof ACCENT_OVERRIDE_LABELS, string | null, (v: string | null) => void][] = [
    ['yellow', accentYellowColor, setAccentYellowColor],
    ['pink', accentPinkColor, setAccentPinkColor],
    ['green', accentGreenColor, setAccentGreenColor],
    ['blue', accentBlueColor, setAccentBlueColor],
    ['lilac', accentLilacColor, setAccentLilacColor],
  ];

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('tokenPrefix', tokenPrefix);
    if (logo) formData.append('logo', logo);
    if (favicon) formData.append('favicon', favicon);
    formData.append('primaryColor', primaryColor ?? '');
    formData.append('accentColor', accentColor ?? '');
    formData.append('accentYellowColor', accentYellowColor ?? '');
    formData.append('accentPinkColor', accentPinkColor ?? '');
    formData.append('accentGreenColor', accentGreenColor ?? '');
    formData.append('accentBlueColor', accentBlueColor ?? '');
    formData.append('accentLilacColor', accentLilacColor ?? '');
    formData.append('radiusRem', radiusRem === null ? '' : String(radiusRem));
    formData.append('sidebarStyle', sidebarStyle ?? '');
    formData.append('qrDarkColor', qrDarkColor ?? '');

    const res = await fetch('/api/admin/branding', { method: 'PATCH', body: formData });
    const body = (await res.json().catch(() => ({}))) as Partial<{
      name: string;
      logoUrl: string | null;
      faviconUrl: string | null;
      tokenPrefix: string;
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ColorField
                id="branding-primary-color"
                label="Color primario"
                value={primaryColor}
                onChange={setPrimaryColor}
                defaultHex={defaultPrimaryHex()}
              />
              <ColorField
                id="branding-accent-color"
                label="Color de acento"
                value={accentColor}
                onChange={setAccentColor}
                defaultHex={defaultAccentHex()}
              />
            </div>
            <p className="text-muted-foreground -mt-2 text-xs">
              El color primario tiñe botones y el foco de los campos. El color de acento tiñe los gráficos y el realce
              del sidebar. Los 5 badges de abajo mantienen su color de siempre a menos que los personalices vos.
            </p>

            <details className="group">
              <summary className="text-muted-foreground hover:text-foreground w-fit cursor-pointer text-xs font-medium underline underline-offset-2 select-none marker:content-none">
                Personalizar colores secundarios individualmente
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {accentOverrideFields.map(([family, value, setValue]) => (
                  <ColorField
                    key={family}
                    id={`branding-accent-${family}`}
                    label={ACCENT_OVERRIDE_LABELS[family]}
                    value={value}
                    onChange={setValue}
                    defaultHex={defaultAccentFamilyHex(family)}
                  />
                ))}
              </div>
            </details>

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

            <ColorField
              id="branding-qr-color"
              label="Color de QR por defecto"
              value={qrDarkColor}
              onChange={setQrDarkColor}
              defaultHex="#000000"
            />

            <div className="flex flex-col gap-2">
              <Label>Vista previa</Label>
              <ThemePreview
                primaryColor={primaryColor}
                accentColor={accentColor}
                accentOverrides={{
                  yellow: accentYellowColor,
                  pink: accentPinkColor,
                  green: accentGreenColor,
                  blue: accentBlueColor,
                  lilac: accentLilacColor,
                }}
                radiusRem={radiusRem}
                sidebarStyle={sidebarStyle}
              />
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
