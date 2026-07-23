// Turns the appearance settings a superadmin picked (brand hue, corner
// radius, sidebar style) into a small CSS override block, injected via
// <style set:html> in BaseLayout.astro. Every input is optional/nullable —
// an instance that never opened the appearance panel gets '' back, which is
// a guaranteed zero-diff from the hardcoded palette in src/styles/global.css.
//
// Rotation model: the design system is already OKLCH end to end, so instead
// of picking a hex per token, a single brand hue (0-359) rotates every
// existing accent/chart/sidebar-accent hue by the same delta — preserving
// their L/C (and therefore contrast) exactly, and preserving the spacing
// between the 5 accent families. --primary/--primary-foreground/--ring (and
// --sidebar/--sidebar-foreground/--sidebar-accent when sidebar_style is
// 'brand') instead adopt the chosen hue directly (not rotated) so the focus
// ring and buttons visibly *are* the brand color rather than an arbitrary
// offset from it.

// accent-blue's light-mode hue in global.css — choosing brand_hue=245 is the
// identity case (delta 0, byte-for-byte the same as not setting a hue).
const ANCHOR_HUE = 245;

function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

// Pure rotation math — exported so the live preview in BrandingManager can
// reuse the exact same formula without duplicating it or the full token
// table below.
export function rotateHue(originalHue: number, brandHue: number): number {
  return normalizeHue(originalHue + (brandHue - ANCHOR_HUE));
}

interface Oklch {
  l: number;
  c: number;
  h: number;
}

function oklch({ l, c, h }: Oklch): string {
  return `oklch(${l} ${c} ${h})`;
}

type ThemeName = 'light' | 'dark';

// Exact L/C/H triples copied from src/styles/global.css's :root/.dark blocks
// — keep the two files in sync if that base palette ever changes.
const ROTATE_TOKENS: Record<ThemeName, Record<string, Oklch>> = {
  light: {
    '--accent-yellow': { l: 0.92, c: 0.11, h: 95 },
    '--accent-yellow-foreground': { l: 0.42, c: 0.09, h: 80 },
    '--accent-pink': { l: 0.9, c: 0.07, h: 350 },
    '--accent-pink-foreground': { l: 0.46, c: 0.13, h: 355 },
    '--accent-green': { l: 0.9, c: 0.08, h: 145 },
    '--accent-green-foreground': { l: 0.44, c: 0.09, h: 150 },
    '--accent-blue': { l: 0.9, c: 0.06, h: 245 },
    '--accent-blue-foreground': { l: 0.46, c: 0.11, h: 255 },
    '--accent-lilac': { l: 0.9, c: 0.06, h: 300 },
    '--accent-lilac-foreground': { l: 0.47, c: 0.12, h: 300 },
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
    '--accent-yellow': { l: 0.5, c: 0.09, h: 90 },
    '--accent-yellow-foreground': { l: 0.94, c: 0.06, h: 95 },
    '--accent-pink': { l: 0.48, c: 0.11, h: 355 },
    '--accent-pink-foreground': { l: 0.93, c: 0.05, h: 350 },
    '--accent-green': { l: 0.47, c: 0.09, h: 150 },
    '--accent-green-foreground': { l: 0.93, c: 0.06, h: 145 },
    '--accent-blue': { l: 0.48, c: 0.1, h: 250 },
    '--accent-blue-foreground': { l: 0.92, c: 0.05, h: 245 },
    '--accent-lilac': { l: 0.49, c: 0.1, h: 300 },
    '--accent-lilac-foreground': { l: 0.93, c: 0.05, h: 300 },
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

// Same L/C as today, hue replaced outright with the chosen brand hue.
const DIRECT_HUE_TOKENS: Record<ThemeName, Record<string, Omit<Oklch, 'h'>>> = {
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
  hue?: number | null;
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

export function buildThemeStyle({ hue, radiusRem, sidebarStyle }: ThemeInput): string {
  // Zod already validates these at the API boundary — this is a second,
  // defensive normalization so a raw/out-of-range value can never reach a
  // CSS string (matches this codebase's "never trust a raw value" pattern
  // elsewhere, e.g. src/lib/url-validation.ts).
  const hasHue = typeof hue === 'number' && Number.isFinite(hue);
  const normalizedHue = hasHue ? normalizeHue(Math.round(hue as number)) : null;
  const hasRadius = typeof radiusRem === 'number' && Number.isFinite(radiusRem);
  const normalizedRadius = hasRadius ? clampRadius(radiusRem as number) : null;
  const brandSidebar = sidebarStyle === 'brand';

  const lightDecls: string[] = [];
  const darkDecls: string[] = [];

  if (normalizedHue !== null) {
    for (const [theme, decls] of [
      ['light', lightDecls],
      ['dark', darkDecls],
    ] as const) {
      for (const [prop, token] of Object.entries(ROTATE_TOKENS[theme])) {
        decls.push(`${prop}: ${oklch({ ...token, h: rotateHue(token.h, normalizedHue) })};`);
      }
      for (const [prop, token] of Object.entries(DIRECT_HUE_TOKENS[theme])) {
        decls.push(`${prop}: ${oklch({ ...token, h: normalizedHue })};`);
      }
      if (brandSidebar) {
        for (const [prop, token] of Object.entries(SIDEBAR_BRAND_TOKENS[theme])) {
          decls.push(`${prop}: ${oklch({ ...token, h: normalizedHue })};`);
        }
      }
    }
  }

  if (normalizedRadius !== null) {
    lightDecls.push(`--radius: ${normalizedRadius}rem;`);
  }

  return renderBlock(':root', lightDecls) + renderBlock('.dark', darkDecls);
}
