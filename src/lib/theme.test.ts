import { describe, expect, it } from 'vitest';
import {
  buildThemeStyle,
  hexToHue,
  previewPalette,
  defaultPrimaryHex,
  defaultAccentHex,
  defaultAccentFamilyHex,
} from './theme';

describe('hexToHue', () => {
  // Reference OKLCH values are the well-known conversions for sRGB primaries
  // (same ones behind oklch.com / the CSS Color 4 spec discussions):
  // #ff0000 -> oklch(62.8% 0.258 29.23), #00ff00 -> oklch(86.6% 0.295 142.5),
  // #0000ff -> oklch(45.2% 0.313 264.05).
  it('matches known OKLCH hue references for sRGB primaries', () => {
    expect(hexToHue('#ff0000')).toBeCloseTo(29.23, 0);
    expect(hexToHue('#00ff00')).toBeCloseTo(142.5, 0);
    expect(hexToHue('#0000ff')).toBeCloseTo(264.05, 0);
  });

  it('is hue-invariant to case and an optional leading #', () => {
    expect(hexToHue('ff0000')).toBeCloseTo(hexToHue('#FF0000')!, 5);
  });

  it('returns null for malformed input', () => {
    expect(hexToHue('not-a-color')).toBeNull();
    expect(hexToHue('#fff')).toBeNull();
    expect(hexToHue('#gggggg')).toBeNull();
  });

  it('returns a number (not NaN) for achromatic colors', () => {
    expect(hexToHue('#808080')).not.toBeNaN();
    expect(hexToHue('#ffffff')).not.toBeNaN();
    expect(hexToHue('#000000')).not.toBeNaN();
  });
});

describe('buildThemeStyle', () => {
  it('returns an empty string when nothing is set', () => {
    expect(buildThemeStyle({})).toBe('');
    expect(buildThemeStyle({ primaryColor: null, accentColor: null, radiusRem: null, sidebarStyle: null })).toBe('');
  });

  it('accent color touches charts/sidebar-primary but never the named badges', () => {
    const css = buildThemeStyle({ accentColor: '#0000ff' });
    expect(css).toContain(':root {');
    expect(css).toContain('.dark {');
    expect(css).toContain('--chart-4:');
    expect(css).toContain('--sidebar-primary:');
    // Named badges must never be touched by accentColor alone — a badge
    // labeled "Azul" rendering some arbitrary rotated hue (e.g. red) is the
    // exact bug this locks in against.
    expect(css).not.toContain('--accent-blue:');
    expect(css).not.toContain('--accent-yellow:');
  });

  it('primary color only touches primary/ring, not the pastel accents or charts', () => {
    const css = buildThemeStyle({ primaryColor: '#ff0000' });
    expect(css).toContain('--primary:');
    expect(css).toContain('--ring:');
    expect(css).not.toContain('--accent-blue:');
    expect(css).not.toContain('--chart-1:');
  });

  it('a per-family override changes only that named badge, never the charts', () => {
    const overridden = buildThemeStyle({ accentColor: '#0000ff', accentOverrides: { pink: '#ff0000' } });
    expect(overridden).toContain('--accent-pink:');
    expect(overridden).not.toContain('--accent-yellow:');
    const chart2Line = overridden.match(/--chart-2: (oklch\([^)]+\));/)?.[1];
    const chart2WithoutOverride = buildThemeStyle({ accentColor: '#0000ff' }).match(
      /--chart-2: (oklch\([^)]+\));/,
    )?.[1];
    expect(chart2Line).toBe(chart2WithoutOverride);
  });

  it('an override with no accentColor set still only emits that one badge', () => {
    const css = buildThemeStyle({ accentOverrides: { yellow: '#00ff00' } });
    expect(css).toContain('--accent-yellow:');
    expect(css).not.toContain('--chart-1:');
    expect(css).not.toContain('--accent-pink:');
  });

  it('only overrides sidebar tokens when sidebarStyle is "brand"', () => {
    expect(buildThemeStyle({ primaryColor: '#ff0000', sidebarStyle: 'dark' })).not.toContain('--sidebar:');
    expect(buildThemeStyle({ primaryColor: '#ff0000', sidebarStyle: 'brand' })).toContain('--sidebar:');
  });

  it('emits only --radius when just radiusRem is set', () => {
    expect(buildThemeStyle({ radiusRem: 0.5 })).toBe(':root {\n  --radius: 0.5rem;\n}\n');
  });

  it('clamps radiusRem to [0, 2]', () => {
    expect(buildThemeStyle({ radiusRem: 5 })).toContain('--radius: 2rem;');
    expect(buildThemeStyle({ radiusRem: -1 })).toContain('--radius: 0rem;');
  });

  it('ignores a malformed color instead of throwing', () => {
    expect(() => buildThemeStyle({ accentColor: 'not-a-color' })).not.toThrow();
    expect(buildThemeStyle({ accentColor: 'not-a-color' })).toBe('');
  });
});

describe('previewPalette', () => {
  it('keeps the 5 named badges at their true default color regardless of accentColor', () => {
    const withoutAccent = previewPalette({}, 'light');
    const withAccent = previewPalette({ accentColor: '#ff0000' }, 'light');
    for (const family of ['yellow', 'pink', 'green', 'blue', 'lilac'] as const) {
      expect(withAccent.accents[family].swatch).toBe(withoutAccent.accents[family].swatch);
    }
  });

  it('an override changes only that one badge', () => {
    const base = previewPalette({}, 'light');
    const overridden = previewPalette({ accentOverrides: { blue: '#ff0000' } }, 'light');
    expect(overridden.accents.blue.swatch).not.toBe(base.accents.blue.swatch);
    expect(overridden.accents.yellow.swatch).toBe(base.accents.yellow.swatch);
  });

  it('keeps the 5 accent families visually distinct', () => {
    const palette = previewPalette({}, 'light');
    const swatches = Object.values(palette.accents).map((a) => a.swatch);
    expect(new Set(swatches).size).toBe(5);
  });

  it('falls back to the default palette hue when no colors are set', () => {
    const light = previewPalette({}, 'light');
    const dark = previewPalette({}, 'dark');
    expect(light.background).not.toBe(dark.background);
  });

  it('reflects sidebarStyle "brand" using the primary color, and defaults otherwise', () => {
    const dark = previewPalette({ primaryColor: '#ff0000', sidebarStyle: 'dark' }, 'light');
    const brand = previewPalette({ primaryColor: '#ff0000', sidebarStyle: 'brand' }, 'light');
    expect(brand.sidebar).not.toBe(dark.sidebar);
  });

  it('resolves radiusRem to a default when unset, and clamps when set', () => {
    expect(previewPalette({}, 'light').radiusRem).toBeGreaterThan(0);
    expect(previewPalette({ radiusRem: 5 }, 'light').radiusRem).toBe(2);
    expect(previewPalette({ radiusRem: -1 }, 'light').radiusRem).toBe(0);
  });
});

describe('default hex helpers', () => {
  it('return well-formed 6-digit hex strings', () => {
    expect(defaultPrimaryHex()).toMatch(/^#[0-9a-f]{6}$/i);
    expect(defaultAccentHex()).toMatch(/^#[0-9a-f]{6}$/i);
    expect(defaultAccentFamilyHex('yellow')).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('produce a different hex per accent family', () => {
    const hexes = (['yellow', 'pink', 'green', 'blue', 'lilac'] as const).map(defaultAccentFamilyHex);
    expect(new Set(hexes).size).toBe(5);
  });
});
