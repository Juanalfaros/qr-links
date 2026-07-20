import { HugeiconsIcon } from '@hugeicons/react';
import { Link04Icon, MouseLeftClick01Icon, Calendar01Icon, Key01Icon } from '@hugeicons/core-free-icons';
import { Card, CardContent, CardDecoration, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BlobShape, SparkleShape } from '@/components/ui/decorative-shapes';
import type { CardTone } from '@/components/ui/card';

interface ProfileStatsRowProps {
  totalLinks: number;
  totalClicks: number;
  linksThisMonth: number;
  tokenCount: number;
}

const TONES: CardTone[] = ['yellow', 'pink', 'green', 'blue'];
const SHAPES = [BlobShape, SparkleShape, BlobShape, SparkleShape];

export function ProfileStatsRow({ totalLinks, totalClicks, linksThisMonth, tokenCount }: ProfileStatsRowProps) {
  const items = [
    { label: 'Links creados', value: totalLinks.toString(), icon: Link04Icon },
    { label: 'Clics totales', value: totalClicks.toString(), icon: MouseLeftClick01Icon },
    { label: 'Links este mes', value: linksThisMonth.toString(), icon: Calendar01Icon },
    { label: 'Tokens de API activos', value: tokenCount.toString(), icon: Key01Icon },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
