import { previewPalette, type ThemeInput } from '@/lib/theme';

const ACCENT_LABELS: Record<'yellow' | 'pink' | 'green' | 'blue' | 'lilac', string> = {
  yellow: 'Amarillo',
  pink: 'Rosa',
  green: 'Verde',
  blue: 'Azul',
  lilac: 'Lila',
};

function Mockup({ label, theme, input }: { label: string; theme: 'light' | 'dark'; input: ThemeInput }) {
  const palette = previewPalette(input, theme);
  const radius = `${palette.radiusRem}rem`;
  const badgeRadius = `${palette.radiusRem * 0.6}rem`;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <div
        className="flex overflow-hidden border"
        style={{
          backgroundColor: palette.background,
          color: palette.foreground,
          borderColor: palette.foreground + '1a',
          borderRadius: radius,
        }}
      >
        {/* Franja del sidebar — siempre presente para mostrar el efecto de sidebar_style */}
        <div
          className="flex w-12 shrink-0 flex-col items-center gap-2 py-3"
          style={{ backgroundColor: palette.sidebar, color: palette.sidebarForeground }}
        >
          <div className="size-5 rounded-full" style={{ backgroundColor: palette.sidebarAccent }} aria-hidden="true" />
          <div
            className="h-1.5 w-6 rounded-full opacity-40"
            style={{ backgroundColor: palette.sidebarForeground }}
            aria-hidden="true"
          />
        </div>
        <div className="flex flex-1 flex-col gap-3 p-3" style={{ backgroundColor: palette.card }}>
          <button
            type="button"
            className="w-fit px-3 py-1.5 text-sm font-medium"
            style={{ backgroundColor: palette.primary, color: palette.primaryForeground, borderRadius: badgeRadius }}
            disabled
          >
            Botón principal
          </button>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(ACCENT_LABELS) as (keyof typeof ACCENT_LABELS)[]).map((family) => (
              <span
                key={family}
                className="px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: palette.accents[family].swatch,
                  color: palette.accents[family].foreground,
                  borderRadius: badgeRadius,
                }}
              >
                {ACCENT_LABELS[family]}
              </span>
            ))}
          </div>
          <div
            className="h-8 w-full"
            style={{ boxShadow: `0 0 0 2px ${palette.ring}`, borderRadius: badgeRadius }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}

// Live preview of the appearance settings currently selected in the form —
// computed client-side with the same math as buildThemeStyle (src/lib/theme.ts),
// so what's shown here matches what the real pages will render after saving.
export function ThemePreview(input: ThemeInput) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Mockup label="Modo claro" theme="light" input={input} />
      <Mockup label="Modo oscuro" theme="dark" input={input} />
    </div>
  );
}
