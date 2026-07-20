import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CardTone } from '@/components/ui/card';

export interface AttentionItem {
  id: string;
  title: string;
  reason: string;
  icon: IconSvgElement;
  tone: CardTone;
}

interface AttentionCardsProps {
  items: AttentionItem[];
}

export function AttentionCards({ items }: AttentionCardsProps) {
  if (items.length === 0) {
    return (
      <Card tone="green">
        <CardContent className="flex items-center gap-3">
          <span className="bg-background/60 flex size-10 shrink-0 items-center justify-center rounded-2xl">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} />
          </span>
          <div>
            <p className="font-medium">Todo al día</p>
            <p className="text-sm text-current/70">Ningún link necesita tu atención por ahora.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <Card key={item.id} tone={item.tone}>
          <CardContent className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="bg-background/60 flex size-10 shrink-0 items-center justify-center rounded-2xl">
                <HugeiconsIcon icon={item.icon} size={18} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="text-xs text-current/70">{item.reason}</p>
              </div>
            </div>
            <a href={`/admin/analytics/${item.id}`} className={cn(buttonVariants({ size: 'sm' }), 'shrink-0')}>
              Ver
            </a>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
