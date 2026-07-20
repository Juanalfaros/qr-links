import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Series {
  label: string;
  days: { day: string; clicks: number }[];
}

interface ClicksOverTimeProps {
  series: Series[];
}

// chart-1..5 are the pastel data-viz palette (see global.css) — used for the
// single-link view too now, not just when comparing multiple series.
const SERIES_COLORS = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];

export function ClicksOverTime({ series }: ClicksOverTimeProps) {
  const allDays = Array.from(new Set(series.flatMap((s) => s.days.map((d) => d.day)))).sort();
  const max = Math.max(1, ...series.flatMap((s) => s.days.map((d) => d.clicks)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Clics en el tiempo</CardTitle>
        {series.length > 1 && (
          <div className="flex flex-wrap gap-3 pt-2">
            {series.map((s, i) => (
              <div key={s.label} className="flex items-center gap-1.5 text-xs">
                <span className={`h-2 w-2 rounded-full ${SERIES_COLORS[i % SERIES_COLORS.length]}`} />
                <span className="text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {allDays.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin datos todavía.</p>
        ) : (
          <div className="flex h-32 items-end gap-1">
            {allDays.map((day) => (
              <div key={day} className="flex flex-1 items-end justify-center gap-0.5">
                {series.map((s, i) => {
                  const clicks = s.days.find((d) => d.day === day)?.clicks ?? 0;
                  return (
                    <div
                      key={s.label}
                      className={`w-full rounded-t ${SERIES_COLORS[i % SERIES_COLORS.length]}`}
                      style={{ height: `${(clicks / max) * 100}%`, minHeight: clicks > 0 ? '2px' : 0 }}
                      title={`${s.label} · ${day}: ${clicks} clics`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
