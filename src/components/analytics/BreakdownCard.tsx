import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BreakdownCardProps {
  title: string;
  items: { label: string; clicks: number }[];
  accent?: 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5';
}

const ACCENT_CLASSES: Record<NonNullable<BreakdownCardProps['accent']>, string> = {
  'chart-1': 'bg-chart-1',
  'chart-2': 'bg-chart-2',
  'chart-3': 'bg-chart-3',
  'chart-4': 'bg-chart-4',
  'chart-5': 'bg-chart-5',
};

export function BreakdownCard({ title, items, accent = 'chart-2' }: BreakdownCardProps) {
  const max = Math.max(1, ...items.map((item) => item.clicks));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.length === 0 && <p className="text-muted-foreground text-sm">Sin datos todavía.</p>}
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span>{item.label}</span>
              <span className="text-muted-foreground">{item.clicks}</span>
            </div>
            <div className="bg-muted h-2 rounded-full">
              <div
                className={`${ACCENT_CLASSES[accent]} h-2 rounded-full`}
                style={{ width: `${(item.clicks / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
