import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCodeDisplay } from '@/components/qr/QrCodeDisplay';
import { LinkProtectionFields } from '@/components/links/LinkProtectionFields';
import { LinkIntegrationsFields } from '@/components/links/LinkIntegrationsFields';
import { UtmBuilderFields } from '@/components/links/UtmBuilderFields';
import { fromDatetimeLocalValue } from '@/lib/datetime';
import { appendUtmParams, type UtmParams } from '@/lib/utm';
import type { LinkRow } from '@/lib/types';

interface CreateLinkDialogProps {
  siteUrl: string;
  logoUrl: string | null;
  qrDarkColor?: string | null;
  onCreated: (link: LinkRow) => void;
}

export function CreateLinkDialog({ siteUrl, logoUrl, qrDarkColor, onCreated }: CreateLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxClicks, setMaxClicks] = useState('');
  const [password, setPassword] = useState('');
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [gaTrackingId, setGaTrackingId] = useState('');
  const [utm, setUtm] = useState<UtmParams>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<LinkRow | null>(null);

  const reset = () => {
    setTitle('');
    setDestinationUrl('');
    setShortCode('');
    setExpiresAt('');
    setMaxClicks('');
    setPassword('');
    setShowInterstitial(false);
    setWebhookUrl('');
    setGaTrackingId('');
    setUtm({});
    setError(null);
    setCreatedLink(null);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/links/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        destination_url: appendUtmParams(destinationUrl, utm),
        short_code: shortCode || undefined,
        expires_at: fromDatetimeLocalValue(expiresAt),
        max_clicks: maxClicks ? Number(maxClicks) : null,
        password: password || undefined,
        show_interstitial: showInterstitial,
        webhook_url: webhookUrl.trim() || null,
        ga_tracking_id: gaTrackingId.trim() || null,
      }),
    });
    const body = (await res.json()) as { error?: string; link?: Omit<LinkRow, 'clicks' | 'tags'> };

    if (!res.ok || !body.link) {
      setError(body.error ?? 'No se pudo crear el link');
      setLoading(false);
      return;
    }

    const link: LinkRow = { ...body.link, clicks: 0, tags: [] };
    setCreatedLink(link);
    onCreated(link);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <HugeiconsIcon icon={PlusSignIcon} size={16} />
        Nuevo link
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{createdLink ? 'Link creado' : 'Nuevo link'}</DialogTitle>
        </DialogHeader>

        {createdLink ? (
          <QrCodeDisplay
            value={`${siteUrl}/${createdLink.short_code}`}
            logoUrl={logoUrl}
            defaultDarkColor={qrDarkColor}
          />
        ) : (
          // form has an id (not wrapping the footer via display:contents) —
          // position:sticky on DialogFooter doesn't compute a correct
          // containing block when its parent is display:contents, which made
          // the "Crear link" button render detached mid-dialog instead of
          // pinned to the bottom.
          <form id="create-link-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="destination_url">URL de destino</Label>
              <Input
                id="destination_url"
                type="url"
                required
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="short_code">Código personalizado (opcional)</Label>
              <Input
                id="short_code"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value)}
                placeholder="Se genera automáticamente si se deja vacío"
              />
            </div>
            <UtmBuilderFields idPrefix="create" value={utm} onChange={setUtm} />
            <LinkProtectionFields
              idPrefix="create"
              expiresAt={expiresAt}
              onExpiresAtChange={setExpiresAt}
              maxClicks={maxClicks}
              onMaxClicksChange={setMaxClicks}
              password={password}
              onPasswordChange={setPassword}
              showInterstitial={showInterstitial}
              onShowInterstitialChange={setShowInterstitial}
            />
            <LinkIntegrationsFields
              idPrefix="create"
              webhookUrl={webhookUrl}
              onWebhookUrlChange={setWebhookUrl}
              gaTrackingId={gaTrackingId}
              onGaTrackingIdChange={setGaTrackingId}
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
          </form>
        )}
        {!createdLink && (
          <DialogFooter>
            <Button type="submit" form="create-link-form" disabled={loading}>
              {loading ? 'Creando...' : 'Crear link'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
