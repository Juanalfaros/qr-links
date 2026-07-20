import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LinkProtectionFieldsProps {
  idPrefix: string;
  expiresAt: string;
  onExpiresAtChange: (value: string) => void;
  maxClicks: string;
  onMaxClicksChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  showInterstitial: boolean;
  onShowInterstitialChange: (value: boolean) => void;
  hasExistingPassword?: boolean;
  removePassword?: boolean;
  onRemovePasswordChange?: (value: boolean) => void;
}

export function LinkProtectionFields({
  idPrefix,
  expiresAt,
  onExpiresAtChange,
  maxClicks,
  onMaxClicksChange,
  password,
  onPasswordChange,
  showInterstitial,
  onShowInterstitialChange,
  hasExistingPassword,
  removePassword,
  onRemovePasswordChange,
}: LinkProtectionFieldsProps) {
  return (
    <details className="group">
      <summary className="text-muted-foreground hover:bg-muted hover:text-foreground -mx-2 flex w-fit cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium transition-colors select-none marker:content-none">
        Opciones avanzadas
        <HugeiconsIcon icon={ArrowDown01Icon} size={14} className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}-expires_at`}>Expira el</Label>
            <Input
              id={`${idPrefix}-expires_at`}
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => onExpiresAtChange(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}-max_clicks`}>Máximo de clics</Label>
            <Input
              id={`${idPrefix}-max_clicks`}
              type="number"
              min={1}
              value={maxClicks}
              onChange={(e) => onMaxClicksChange(e.target.value)}
              placeholder="Sin límite"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-password`}>
            {hasExistingPassword ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña (opcional)'}
          </Label>
          <Input
            id={`${idPrefix}-password`}
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder={hasExistingPassword ? '••••••••' : 'Sin contraseña'}
            disabled={removePassword}
          />
          {hasExistingPassword && onRemovePasswordChange && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={removePassword}
                onChange={(e) => onRemovePasswordChange(e.target.checked)}
              />
              Quitar contraseña
            </label>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showInterstitial}
            onChange={(e) => onShowInterstitialChange(e.target.checked)}
          />
          Mostrar advertencia antes de redirigir
        </label>
      </div>
    </details>
  );
}
