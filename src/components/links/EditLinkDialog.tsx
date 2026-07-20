import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { TagPicker } from '@/components/links/TagPicker';
import { LinkProtectionFields } from '@/components/links/LinkProtectionFields';
import { LinkIntegrationsFields } from '@/components/links/LinkIntegrationsFields';
import { UtmBuilderFields } from '@/components/links/UtmBuilderFields';
import { toDatetimeLocalValue, fromDatetimeLocalValue } from '@/lib/datetime';
import { appendUtmParams, type UtmParams } from '@/lib/utm';
import type { LinkRow, TagRow } from '@/lib/types';

interface EditLinkDialogProps {
  link: LinkRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (link: LinkRow) => void;
}

export function EditLinkDialog({ link, open, onOpenChange, onUpdated }: EditLinkDialogProps) {
  const [title, setTitle] = useState(link.title);
  const [destinationUrl, setDestinationUrl] = useState(link.destination_url);
  const [expiresAt, setExpiresAt] = useState('');
  const [maxClicks, setMaxClicks] = useState('');
  const [password, setPassword] = useState('');
  const [removePassword, setRemovePassword] = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(link.show_interstitial);
  const [webhookUrl, setWebhookUrl] = useState(link.webhook_url ?? '');
  const [gaTrackingId, setGaTrackingId] = useState(link.ga_tracking_id ?? '');
  const [utm, setUtm] = useState<UtmParams>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(link.title);
      setDestinationUrl(link.destination_url);
      setExpiresAt(toDatetimeLocalValue(link.expires_at));
      setMaxClicks(link.max_clicks ? String(link.max_clicks) : '');
      setPassword('');
      setRemovePassword(false);
      setShowInterstitial(link.show_interstitial);
      setWebhookUrl(link.webhook_url ?? '');
      setGaTrackingId(link.ga_tracking_id ?? '');
      setUtm({});
      setError(null);
    }
  }, [open, link]);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const body: Record<string, unknown> = {
      title,
      destination_url: appendUtmParams(destinationUrl, utm),
      expires_at: fromDatetimeLocalValue(expiresAt),
      max_clicks: maxClicks ? Number(maxClicks) : null,
      show_interstitial: showInterstitial,
      webhook_url: webhookUrl.trim() || null,
      ga_tracking_id: gaTrackingId.trim() || null,
    };
    if (removePassword) {
      body.password = null;
    } else if (password.trim()) {
      body.password = password.trim();
    }

    const res = await fetch(`/api/links/${link.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const resBody = (await res.json()) as { error?: string; link?: Omit<LinkRow, 'clicks' | 'tags'> };

    if (!res.ok || !resBody.link) {
      setError(resBody.error ?? 'No se pudo actualizar el link');
      setLoading(false);
      return;
    }

    onUpdated({ ...link, ...resBody.link });
    setLoading(false);
    onOpenChange(false);
  };

  const handleTagsChange = (tags: TagRow[]) => {
    onUpdated({ ...link, tags });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar link</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {/* id+form (not nesting this in the form) — TagPicker below has its
              own <form> for adding a tag, and forms can't nest in HTML: the
              browser silently closes the outer one when it hits the inner
              one, which broke both the tag-add flow and this save button. */}
          <form id="edit-link-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-title">Título</Label>
              <Input id="edit-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-destination_url">URL de destino</Label>
              <Input
                id="edit-destination_url"
                type="url"
                required
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
              />
            </div>
            <UtmBuilderFields idPrefix="edit" value={utm} onChange={setUtm} />
            <LinkProtectionFields
              idPrefix="edit"
              expiresAt={expiresAt}
              onExpiresAtChange={setExpiresAt}
              maxClicks={maxClicks}
              onMaxClicksChange={setMaxClicks}
              password={password}
              onPasswordChange={setPassword}
              showInterstitial={showInterstitial}
              onShowInterstitialChange={setShowInterstitial}
              hasExistingPassword={link.has_password}
              removePassword={removePassword}
              onRemovePasswordChange={setRemovePassword}
            />
            <LinkIntegrationsFields
              idPrefix="edit"
              webhookUrl={webhookUrl}
              onWebhookUrlChange={setWebhookUrl}
              gaTrackingId={gaTrackingId}
              onGaTrackingIdChange={setGaTrackingId}
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
          </form>
          <Separator />
          <TagPicker linkId={link.id} initialTags={link.tags} onTagsChange={handleTagsChange} />
        </div>
        <DialogFooter>
          <Button type="submit" form="edit-link-form" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
