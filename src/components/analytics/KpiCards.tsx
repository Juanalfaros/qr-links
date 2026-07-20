import { HugeiconsIcon } from '@hugeicons/react';
import { InformationCircleIcon } from '@hugeicons/core-free-icons';
import { Card, CardContent, CardDecoration, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BlobShape, SparkleShape } from '@/components/ui/decorative-shapes';
import type { CardTone } from '@/components/ui/card';

interface KpiCardsProps {
  totalClicks: number;
  uniqueClicks: number;
  topCountry: string;
  topDevice: string;
}

const TONES: CardTone[] = ['yellow', 'pink', 'green', 'blue'];
const SHAPES = [BlobShape, SparkleShape, BlobShape, SparkleShape];

export function KpiCards({ totalClicks, uniqueClicks, topCountry, topDevice }: KpiCardsProps) {
  const items = [
    {
      label: 'Clics totales',
      value: totalClicks.toString(),
      hint: 'Cada vez que se abrió el link, sin deduplicar por visitante.',
    },
    {
      label: 'Clics únicos',
      value: uniqueClicks.toString(),
      hint: 'Visitantes distintos por día, aproximados con un hash de IP + link que nunca se guarda en texto plano.',
    },
    { label: 'País principal', value: topCountry, hint: 'El país con más clics en el rango seleccionado.' },
    {
      label: 'Dispositivo principal',
      value: topDevice,
      hint: 'El tipo de dispositivo (móvil/escritorio/tablet) con más clics.',
    },
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => {
          const Shape = SHAPES[i % SHAPES.length];
          return (
            <Card key={item.label} tone={TONES[i % TONES.length]}>
              <CardDecoration>
                <Shape className="size-24" />
              </CardDecoration>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1 text-current/70">
                  {item.label}
                  <Tooltip>
                    <TooltipTrigger
                      aria-label={`Qué significa: ${item.label}`}
                      className="text-current/60 hover:text-current"
                    >
                      <HugeiconsIcon icon={InformationCircleIcon} size={14} />
                    </TooltipTrigger>
                    <TooltipContent>{item.hint}</TooltipContent>
                  </Tooltip>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CardTitle className="font-heading text-3xl font-semibold">{item.value}</CardTitle>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
