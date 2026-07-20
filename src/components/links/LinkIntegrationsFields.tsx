import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LinkIntegrationsFieldsProps {
  idPrefix: string;
  webhookUrl: string;
  onWebhookUrlChange: (value: string) => void;
  gaTrackingId: string;
  onGaTrackingIdChange: (value: string) => void;
}

export function LinkIntegrationsFields({
  idPrefix,
  webhookUrl,
  onWebhookUrlChange,
  gaTrackingId,
  onGaTrackingIdChange,
}: LinkIntegrationsFieldsProps) {
  return (
    <details className="group">
      <summary className="text-muted-foreground hover:bg-muted hover:text-foreground -mx-2 flex w-fit cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium transition-colors select-none marker:content-none">
        Integraciones
        <HugeiconsIcon icon={ArrowDown01Icon} size={14} className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-webhook_url`}>Webhook al escanear (opcional)</Label>
          <Input
            id={`${idPrefix}-webhook_url`}
            type="url"
            value={webhookUrl}
            onChange={(e) => onWebhookUrlChange(e.target.value)}
            placeholder="https://tu-servicio.com/webhook"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-ga_tracking_id`}>ID de Google Analytics/GTM (opcional)</Label>
          <Input
            id={`${idPrefix}-ga_tracking_id`}
            value={gaTrackingId}
            onChange={(e) => onGaTrackingIdChange(e.target.value)}
            placeholder="G-XXXXXXXXXX"
          />
          <p className="text-muted-foreground text-xs">
            Solo se inyecta si el link tiene activada la advertencia antes de redirigir.
          </p>
        </div>
      </div>
    </details>
  );
}
