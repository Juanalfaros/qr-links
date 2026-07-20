interface DonutSegment {
  label: string;
  value: number;
}

interface DonutChartProps {
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
}

// Same 5-colour pastel palette as chart-1..5 everywhere else — reused here
// as SVG stroke colours instead of bar fills.
const SEGMENT_STROKE_CLASSES = [
  'stroke-chart-1',
  'stroke-chart-2',
  'stroke-chart-3',
  'stroke-chart-4',
  'stroke-chart-5',
];

const SIZE = 168;
const STROKE = 20;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutChart({ segments, centerValue, centerLabel }: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let cumulative = 0;

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
        role="img"
        aria-label={`Gráfico de ${centerLabel.toLowerCase()} por dispositivo`}
      >
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-muted" />
        {total > 0 &&
          segments.map((seg, i) => {
            if (seg.value <= 0) return null;
            const fraction = seg.value / total;
            const dash = fraction * CIRCUMFERENCE;
            const dashOffset = -cumulative * CIRCUMFERENCE;
            cumulative += fraction;
            return (
              <circle
                key={seg.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                strokeWidth={STROKE}
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className={SEGMENT_STROKE_CLASSES[i % SEGMENT_STROKE_CLASSES.length]}
              />
            );
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="font-heading text-3xl font-semibold">{centerValue}</span>
        <span className="text-muted-foreground text-center text-xs">{centerLabel}</span>
      </div>
    </div>
  );
}
