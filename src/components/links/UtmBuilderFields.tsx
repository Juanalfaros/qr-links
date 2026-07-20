import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UtmParams } from '@/lib/utm';

interface UtmBuilderFieldsProps {
  idPrefix: string;
  value: UtmParams;
  onChange: (value: UtmParams) => void;
}

export function UtmBuilderFields({ idPrefix, value, onChange }: UtmBuilderFieldsProps) {
  return (
    <details className="group">
      <summary className="text-muted-foreground hover:bg-muted hover:text-foreground -mx-2 flex w-fit cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium transition-colors select-none marker:content-none">
        Parámetros UTM
        <HugeiconsIcon icon={ArrowDown01Icon} size={14} className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-utm_source`}>Source</Label>
          <Input
            id={`${idPrefix}-utm_source`}
            value={value.utm_source ?? ''}
            onChange={(e) => onChange({ ...value, utm_source: e.target.value })}
            placeholder="newsletter"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-utm_medium`}>Medium</Label>
          <Input
            id={`${idPrefix}-utm_medium`}
            value={value.utm_medium ?? ''}
            onChange={(e) => onChange({ ...value, utm_medium: e.target.value })}
            placeholder="email"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-utm_campaign`}>Campaign</Label>
          <Input
            id={`${idPrefix}-utm_campaign`}
            value={value.utm_campaign ?? ''}
            onChange={(e) => onChange({ ...value, utm_campaign: e.target.value })}
            placeholder="lanzamiento-q1"
          />
        </div>
      </div>
    </details>
  );
}
