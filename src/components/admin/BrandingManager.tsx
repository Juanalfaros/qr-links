import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileDropzone } from '@/components/ui/file-dropzone';
import type { Branding } from '@/lib/branding';

interface BrandingManagerProps {
  initialBranding: Branding;
}

export function BrandingManager({ initialBranding }: BrandingManagerProps) {
  const [currentLogoUrl, setCurrentLogoUrl] = useState(initialBranding.logoUrl);
  const [currentFaviconUrl, setCurrentFaviconUrl] = useState(initialBranding.faviconUrl);
  const [name, setName] = useState(initialBranding.name);
  const [tokenPrefix, setTokenPrefix] = useState(initialBranding.tokenPrefix);
  const [logo, setLogo] = useState<File | null>(null);
  const [favicon, setFavicon] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('tokenPrefix', tokenPrefix);
    if (logo) formData.append('logo', logo);
    if (favicon) formData.append('favicon', favicon);

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
    toast.success('Branding actualizado');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Branding</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                accept="image/svg+xml,image/png,image/jpeg"
                file={logo}
                onFileChange={setLogo}
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
                accept="image/svg+xml,image/png,image/x-icon"
                file={favicon}
                onFileChange={setFavicon}
                hint="Arrastra un archivo para reemplazarlo"
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
