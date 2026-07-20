import { HugeiconsIcon } from '@hugeicons/react';
import { MouseLeftClick01Icon, UserMultiple02Icon, Link04Icon } from '@hugeicons/core-free-icons';
import { Card, CardContent, CardDecoration, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BlobShape, SparkleShape } from '@/components/ui/decorative-shapes';
import type { CardTone } from '@/components/ui/card';

interface SummaryStatsRowProps {
  totalClicks: number;
  uniqueClicks: number;
  activeLinks: number;
}

const TONES: CardTone[] = ['pink', 'blue', 'yellow'];
const SHAPES = [BlobShape, SparkleShape, BlobShape];

export function SummaryStatsRow({ totalClicks, uniqueClicks, activeLinks }: SummaryStatsRowProps) {
  const items = [
    { label: 'Clics totales', value: totalClicks.toLocaleString(), icon: MouseLeftClick01Icon },
    { label: 'Clics únicos', value: uniqueClicks.toLocaleString(), icon: UserMultiple02Icon },
    { label: 'Links activos', value: activeLinks.toLocaleString(), icon: Link04Icon },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((item, i) => {
        const Shape = SHAPES[i % SHAPES.length];
        return (
          <Card key={item.label} tone={TONES[i % TONES.length]}>
            <CardDecoration>
              <Shape className="size-24" />
            </CardDecoration>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-current/70">
                <HugeiconsIcon icon={item.icon} size={14} />
                {item.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CardTitle className="font-heading text-3xl font-semibold">{item.value}</CardTitle>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
