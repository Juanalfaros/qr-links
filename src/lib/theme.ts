// Turns the appearance settings a superadmin picked (primary color, accent
// color, optional per-swatch overrides, corner radius, sidebar style) into a
// small CSS override block, injected via <style set:html> in BaseLayout.astro.
// Every input is optional/nullable — an instance that never opened the
// appearance panel gets '' back, a guaranteed zero-diff from the hardcoded
// palette in src/styles/global.css.
//
// Model: the superadmin picks real hex colors (native <input type="color">),
// not raw hue numbers — but only each color's *hue* is actually used. L/C
// (lightness/chroma) always come from the hand-tuned base palette, so
// contrast/legibility in both themes is guaranteed by construction no matter
// what hex was picked; the live preview in BrandingManager is what tells the
// superadmin what they'll actually get.
//   - "Color primario" -> --primary/--primary-foreground/--ring (both
//     themes), and --sidebar/--sidebar-foreground/--sidebar-accent when
//     sidebar_style is 'brand'.
//   - "Color de acento" -> rotates only the cohesive, unnamed groups:
//     --chart-1..5 and --sidebar-primary/-foreground/-ring, all by the same
//     hue delta, preserving their spacing. It deliberately does NOT touch
//     the 5 *named* pastel badges (yellow/pink/green/blue/lilac) — rotating
//     them by an arbitrary delta would make a badge labeled "Azul" render
//     red (whatever hue happens to land there), which is confusing
//     regardless of the math being internally consistent. A UI element
//     whose label promises a color must render that color.
//   - Each of the 5 named pastel badges keeps its true default color unless
//     individually overridden with its own hex — never derived from the
//     accent color.

interface Oklch {
  l: number;
  c: number;
  h: number;
}

function oklch({ l, c, h }: Oklch): string {
  return `oklch(${l} ${c} ${h})`;
}

function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

function srgbToLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

// sRGB hex -> OKLab -> hue (degrees). Only the hue is used anywhere in this
// module — see the module doc comment for why. Standard Björn Ottosson OKLab
// conversion matrices (the same ones behind oklch.com and CSS Color 4).
export function hexToHue(hex: string): number | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;

  const int = parseInt(match[1], 16);
  const r = srgbToLinear(((int >> 16) & 255) / 255);
  const g = srgbToLinear(((int >> 8) & 255) / 255);
  const b = srgbToLinear((int & 255) / 255);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bOk = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  return normalizeHue((Math.atan2(bOk, a) * 180) / Math.PI);
}

function linearToSrgb(channel: number): number {
  const clamped = Math.min(1, Math.max(0, channel));
  return clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

// Inverse of hexToHue — OKLCH -> OKLab -> linear RGB -> sRGB hex. Same
// Björn Ottosson matrices, inverted. Used only to show an accurate "here's
// today's actual default" swatch in a color picker before it's customized —
// never fed back into hexToHue (that would just round-trip losslessly on
// hue but isn't needed).
export function oklchToHex({ l, c, h }: Oklch): string {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const lCubed = l_ ** 3;
  const mCubed = m_ ** 3;
  const sCubed = s_ ** 3;

  const r = 4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed;
  const g = -1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed;
  const bChannel = -0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.707614701 * sCubed;

  const toHexByte = (channel: number) =>
    Math.round(linearToSrgb(channel) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(bChannel)}`;
}

// Hues global.css actually hardcodes today for --primary (65) and the
// anchor used for accent rotation (245, accent-blue's own hue) — used only
// to render an accurate "this is today's default" swatch in a picker before
// it's been customized.
const DEFAULT_PRIMARY_HUE = 65;
const DEFAULT_ACCENT_HUE = 245;

// Pure rotation math for the accent-anchored tokens (charts, sidebar
// accents, and any pastel family without its own override).
function rotateHue(originalHue: number, brandHue: number): number {
  // accent-blue's light-mode hue in global.css — an accent color whose hue
  // is 245 is the identity case (delta 0, byte-for-byte today's palette).
  const ANCHOR_HUE = 245;
  return normalizeHue(originalHue + (brandHue - ANCHOR_HUE));
}

type ThemeName = 'light' | 'dark';
type AccentFamily = 'yellow' | 'pink' | 'green' | 'blue' | 'lilac';

const ACCENT_FAMILIES: AccentFamily[] = ['yellow', 'pink', 'green', 'blue', 'lilac'];

// Exact L/C/H triples copied from src/styles/global.css's :root/.dark blocks
// — keep the two files in sync if that base palette ever changes.
const ACCENT_TOKENS: Record<ThemeName, Record<AccentFamily, { swatch: Oklch; foreground: Oklch }>> = {
  light: {
    yellow: { swatch: { l: 0.92, c: 0.11, h: 95 }, foreground: { l: 0.42, c: 0.09, h: 80 } },
    pink: { swatch: { l: 0.9, c: 0.07, h: 350 }, foreground: { l: 0.46, c: 0.13, h: 355 } },
    green: { swatch: { l: 0.9, c: 0.08, h: 145 }, foreground: { l: 0.44, c: 0.09, h: 150 } },
    blue: { swatch: { l: 0.9, c: 0.06, h: 245 }, foreground: { l: 0.46, c: 0.11, h: 255 } },
    lilac: { swatch: { l: 0.9, c: 0.06, h: 300 }, foreground: { l: 0.47, c: 0.12, h: 300 } },
  },
  dark: {
    yellow: { swatch: { l: 0.5, c: 0.09, h: 90 }, foreground: { l: 0.94, c: 0.06, h: 95 } },
    pink: { swatch: { l: 0.48, c: 0.11, h: 355 }, foreground: { l: 0.93, c: 0.05, h: 350 } },
    green: { swatch: { l: 0.47, c: 0.09, h: 150 }, foreground: { l: 0.93, c: 0.06, h: 145 } },
    blue: { swatch: { l: 0.48, c: 0.1, h: 250 }, foreground: { l: 0.92, c: 0.05, h: 245 } },
    lilac: { swatch: { l: 0.49, c: 0.1, h: 300 }, foreground: { l: 0.93, c: 0.05, h: 300 } },
  },
};

// Charts + sidebar-primary/-ring: always follow the accent color's rotation,
// never individually overridable (keeps data-viz/sidebar cohesive).
const ACCENT_ROTATED_TOKENS: Record<ThemeName, Record<string, Oklch>> = {
  light: {
    '--chart-1': { l: 0.82, c: 0.14, h: 95 },
    '--chart-2': { l: 0.78, c: 0.12, h: 350 },
    '--chart-3': { l: 0.78, c: 0.13, h: 145 },
    '--chart-4': { l: 0.75, c: 0.11, h: 245 },
    '--chart-5': { l: 0.75, c: 0.12, h: 300 },
    '--sidebar-primary': { l: 0.9, c: 0.07, h: 350 },
    '--sidebar-primary-foreground': { l: 0.26, c: 0.03, h: 355 },
    '--sidebar-ring': { l: 0.9, c: 0.07, h: 350 },
  },
  dark: {
    '--chart-1': { l: 0.82, c: 0.13, h: 95 },
    '--chart-2': { l: 0.76, c: 0.12, h: 350 },
    '--chart-3': { l: 0.76, c: 0.12, h: 145 },
    '--chart-4': { l: 0.73, c: 0.11, h: 245 },
    '--chart-5': { l: 0.74, c: 0.12, h: 300 },
    '--sidebar-primary': { l: 0.5, c: 0.11, h: 355 },
    '--sidebar-primary-foreground': { l: 0.95, c: 0.04, h: 350 },
    '--sidebar-ring': { l: 0.5, c: 0.11, h: 355 },
  },
};

// Same L/C as today, hue replaced outright with the primary color's hue.
const PRIMARY_TOKENS: Record<ThemeName, Record<string, Omit<Oklch, 'h'>>> = {
  light: {
    '--primary': { l: 0.24, c: 0.012 },
    '--primary-foreground': { l: 0.98, c: 0.008 },
    '--ring': { l: 0.78, c: 0.09 },
  },
  dark: {
    '--primary': { l: 0.92, c: 0.01 },
    '--primary-foreground': { l: 0.24, c: 0.014 },
    '--ring': { l: 0.55, c: 0.06 },
  },
};

// Only applied when sidebarStyle === 'brand'. --sidebar-border is
// deliberately excluded — it's a white+alpha value with no hue to speak of.
const SIDEBAR_BRAND_TOKENS: Record<ThemeName, Record<string, Omit<Oklch, 'h'>>> = {
  light: {
    '--sidebar': { l: 0.24, c: 0.014 },
    '--sidebar-foreground': { l: 0.92, c: 0.008 },
    '--sidebar-accent': { l: 0.31, c: 0.014 },
  },
  dark: {
    '--sidebar': { l: 0.17, c: 0.012 },
    '--sidebar-foreground': { l: 0.92, c: 0.008 },
    '--sidebar-accent': { l: 0.28, c: 0.014 },
  },
};

export interface ThemeInput {
  primaryColor?: string | null;
  accentColor?: string | null;
  accentOverrides?: Partial<Record<AccentFamily, string | null>> | null;
  radiusRem?: number | null;
  sidebarStyle?: 'dark' | 'brand' | null;
}

function clampRadius(value: number): number {
  return Math.min(2, Math.max(0, value));
}

function renderBlock(selector: string, declarations: string[]): string {
  if (declarations.length === 0) return '';
  return `${selector} {\n${declarations.map((d) => `  ${d}`).join('\n')}\n}\n`;
}

export function buildThemeStyle({
  primaryColor,
  accentColor,
  accentOverrides,
  radiusRem,
  sidebarStyle,
}: ThemeInput): string {
  // Zod already validates these as `#rrggbb` at the API boundary — hexToHue
  // returning null for anything malformed is a second, defensive layer so a
  // raw/invalid value can never reach a CSS string (matches this codebase's
  // "never trust a raw value" pattern elsewhere, e.g. url-validation.ts).
  const primaryHue = primaryColor ? hexToHue(primaryColor) : null;
  const accentHue = accentColor ? hexToHue(accentColor) : null;
  const hasRadius = typeof radiusRem === 'number' && Number.isFinite(radiusRem);
  const normalizedRadius = hasRadius ? clampRadius(radiusRem as number) : null;
  const brandSidebar = sidebarStyle === 'brand';

  const lightDecls: string[] = [];
  const darkDecls: string[] = [];

  for (const [theme, decls] of [
    ['light', lightDecls],
    ['dark', darkDecls],
  ] as const) {
    // Named badges never follow the accent color's rotation — only an
    // explicit per-family override changes one. See the module doc comment
    // for why: a badge labeled "Azul" rendering red would be confusing no
    // matter how internally consistent the rotation math is.
    for (const family of ACCENT_FAMILIES) {
      const overrideHex = accentOverrides?.[family];
      const overrideHue = overrideHex ? hexToHue(overrideHex) : null;
      if (overrideHue === null) continue;
      const { swatch, foreground } = ACCENT_TOKENS[theme][family];
      decls.push(`--accent-${family}: ${oklch({ ...swatch, h: overrideHue })};`);
      decls.push(`--accent-${family}-foreground: ${oklch({ ...foreground, h: overrideHue })};`);
    }

    if (accentHue !== null) {
      for (const [prop, token] of Object.entries(ACCENT_ROTATED_TOKENS[theme])) {
        decls.push(`${prop}: ${oklch({ ...token, h: rotateHue(token.h, accentHue) })};`);
      }
    }

    if (primaryHue !== null) {
      for (const [prop, token] of Object.entries(PRIMARY_TOKENS[theme])) {
        decls.push(`${prop}: ${oklch({ ...token, h: primaryHue })};`);
      }
      if (brandSidebar) {
        for (const [prop, token] of Object.entries(SIDEBAR_BRAND_TOKENS[theme])) {
          decls.push(`${prop}: ${oklch({ ...token, h: primaryHue })};`);
        }
      }
    }
  }

  if (normalizedRadius !== null) {
    lightDecls.push(`--radius: ${normalizedRadius}rem;`);
  }

  return renderBlock(':root', lightDecls) + renderBlock('.dark', darkDecls);
}

// Precomputed swatch colors for the live mockup in BrandingManager/SetupForm
// — the exact same math as buildThemeStyle, just returned as a plain object
// instead of a CSS string, since the mockup styles a handful of elements
// directly rather than going through custom properties.
export interface PreviewPalette {
  background: string;
  foreground: string;
  card: string;
  primary: string;
  primaryForeground: string;
  ring: string;
  accents: Record<AccentFamily, { swatch: string; foreground: string }>;
  sidebar: string;
  sidebarForeground: string;
  sidebarAccent: string;
  radiusRem: number;
}

const DEFAULT_RADIUS_REM = 0.9;

const BASE_SURFACE_TOKENS: Record<ThemeName, { background: Oklch; foreground: Oklch; card: Oklch }> = {
  light: {
    background: { l: 0.968, c: 0.012, h: 85 },
    foreground: { l: 0.24, c: 0.015, h: 65 },
    card: { l: 0.995, c: 0.005, h: 85 },
  },
  dark: {
    background: { l: 0.2, c: 0.012, h: 65 },
    foreground: { l: 0.94, c: 0.008, h: 85 },
    card: { l: 0.255, c: 0.014, h: 65 },
  },
};

export function previewPalette(input: ThemeInput, theme: ThemeName): PreviewPalette {
  const primaryHue = input.primaryColor ? hexToHue(input.primaryColor) : null;
  const surface = BASE_SURFACE_TOKENS[theme];
  const primaryToken = PRIMARY_TOKENS[theme];
  const brandSidebar = input.sidebarStyle === 'brand';

  // Named badges: true default color unless individually overridden — never
  // derived from accentColor. See buildThemeStyle's matching logic.
  const accents = Object.fromEntries(
    ACCENT_FAMILIES.map((family) => {
      const overrideHex = input.accentOverrides?.[family];
      const overrideHue = overrideHex ? hexToHue(overrideHex) : null;
      const hue = overrideHue ?? ACCENT_TOKENS[theme][family].swatch.h;
      const fgHue = overrideHue ?? ACCENT_TOKENS[theme][family].foreground.h;
      return [
        family,
        {
          swatch: oklch({ ...ACCENT_TOKENS[theme][family].swatch, h: hue }),
          foreground: oklch({ ...ACCENT_TOKENS[theme][family].foreground, h: fgHue }),
        },
      ];
    }),
  ) as Record<AccentFamily, { swatch: string; foreground: string }>;

  const sidebarHue = brandSidebar && primaryHue !== null ? primaryHue : DEFAULT_PRIMARY_HUE;
  const sidebarToken = SIDEBAR_BRAND_TOKENS[theme];

  const hasRadius = typeof input.radiusRem === 'number' && Number.isFinite(input.radiusRem);
  const radiusRem = hasRadius ? clampRadius(input.radiusRem as number) : DEFAULT_RADIUS_REM;

  return {
    background: oklch(surface.background),
    foreground: oklch(surface.foreground),
    card: oklch(surface.card),
    primary: oklch({ ...primaryToken['--primary'], h: primaryHue ?? DEFAULT_PRIMARY_HUE }),
    primaryForeground: oklch({ ...primaryToken['--primary-foreground'], h: primaryHue ?? DEFAULT_PRIMARY_HUE }),
    ring: oklch({ ...primaryToken['--ring'], h: primaryHue ?? DEFAULT_PRIMARY_HUE }),
    accents,
    sidebar: oklch({ ...sidebarToken['--sidebar'], h: sidebarHue }),
    sidebarForeground: oklch({ ...sidebarToken['--sidebar-foreground'], h: sidebarHue }),
    sidebarAccent: oklch({ ...sidebarToken['--sidebar-accent'], h: sidebarHue }),
    radiusRem,
  };
}

// "What does this look like today, before customizing" hex values for the
// color pickers in BrandingManager/SetupForm — so an unset field shows its
// true current color instead of a misleading plain black square.
export function defaultPrimaryHex(): string {
  return oklchToHex({ l: 0.24, c: 0.012, h: DEFAULT_PRIMARY_HUE });
}

export function defaultAccentHex(): string {
  return oklchToHex({ l: 0.75, c: 0.11, h: DEFAULT_ACCENT_HUE });
}

export function defaultAccentFamilyHex(family: AccentFamily): string {
  return oklchToHex(ACCENT_TOKENS.light[family].swatch);
}

// background_color for the web app manifest (src/pages/manifest.webmanifest.ts)
// — browsers use this for the splash screen shown while a PWA launches.
// Not customizable via branding today, so this is just the light-mode
// --background value from src/styles/global.css, as a hex (manifest colors
// need broad-compatibility hex, not oklch()).
export function defaultBackgroundHex(): string {
  return oklchToHex({ l: 0.968, c: 0.012, h: 85 });
}

export type { AccentFamily };
