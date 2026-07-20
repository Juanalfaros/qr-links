import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface WorldMapProps {
  data: { label: string; clicks: number }[];
}

// A choropleth needs a *sequential* scale (low → high must read as light →
// dark within one hue) — the categorical chart-1..5 palette is 5 different
// hues with no inherent order, which would make "which country has more
// clicks" unreadable. Instead this mixes increasing amounts of the pink
// accent's foreground into the card surface, same color-mix() pattern
// already used for hover states in ui/button.tsx.
const BUCKET_COLORS = [1, 2, 3, 4, 5].map(
  (step) => `color-mix(in oklch, var(--accent-pink-foreground) ${step * 18}%, var(--card))`,
);
const NO_DATA_COLOR = 'var(--muted)';

function colorFor(clicks: number, max: number): string {
  if (clicks <= 0) return NO_DATA_COLOR;
  const ratio = clicks / max;
  const idx = Math.min(BUCKET_COLORS.length - 1, Math.floor(ratio * BUCKET_COLORS.length));
  return BUCKET_COLORS[idx];
}

// Public-domain SVG (Wikimedia Commons "BlankMap-World6.svg") fetched once
// and cached as a static asset — one <g id="{iso-alpha-2, lowercase}"> per
// territory. Deliberately hand-rolled instead of react-simple-maps/d3-geo/
// topojson: those pull in real weight for something this simple (color N
// existing paths by a lookup), and cf.country already gives us ISO alpha-2
// codes directly, no projection math needed.
export function WorldMap({ data }: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgText, setSvgText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/world-map.svg')
      .then((res) => res.text())
      .then((text) => {
        if (!cancelled) setSvgText(text);
      })
      .catch(() => {
        /* leave svgText null — renders the loading/empty message below */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const svg = containerRef.current?.querySelector('svg');
    if (!svg) return;
    svg.setAttribute('style', 'width: 100%; height: auto; display: block;');

    const max = Math.max(1, ...data.map((d) => d.clicks));
    const clicksByCode = new Map(data.map((d) => [d.label.toLowerCase(), d.clicks]));

    svg.querySelectorAll<SVGElement>('[id]').forEach((el) => {
      const code = el.id.toLowerCase();
      if (!/^[a-z]{2}$/.test(code)) return;
      const color = colorFor(clicksByCode.get(code) ?? 0, max);
      const paths = el.tagName.toLowerCase() === 'path' ? [el] : Array.from(el.querySelectorAll('path'));
      paths.forEach((path) => {
        (path as unknown as SVGPathElement).style.fill = color;
      });
    });
  }, [svgText, data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Clics por país</CardTitle>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <span className="text-muted-foreground text-xs">Menos</span>
          {BUCKET_COLORS.map((color) => (
            <span key={color} className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
          ))}
          <span className="text-muted-foreground text-xs">Más</span>
        </div>
      </CardHeader>
      <CardContent>
        {!svgText ? (
          <Skeleton className="aspect-[2/1] w-full" />
        ) : (
          <div ref={containerRef} dangerouslySetInnerHTML={{ __html: svgText }} />
        )}
      </CardContent>
    </Card>
  );
}
