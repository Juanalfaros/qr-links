import { describe, expect, it } from 'vitest';
import { buildThemeStyle, hexToHue, previewPalette } from './theme';

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

  it('emits :root and .dark blocks when an accent color is set', () => {
    const css = buildThemeStyle({ accentColor: '#0000ff' });
    expect(css).toContain(':root {');
    expect(css).toContain('.dark {');
    expect(css).toContain('--accent-blue:');
    expect(css).toContain('--chart-4:');
  });

  it('primary color only touches primary/ring, not the pastel accents', () => {
    const css = buildThemeStyle({ primaryColor: '#ff0000' });
    expect(css).toContain('--primary:');
    expect(css).toContain('--ring:');
    expect(css).not.toContain('--accent-blue:');
  });

  it('a per-family override changes only that family, not the charts', () => {
    const overridden = buildThemeStyle({ accentColor: '#0000ff', accentOverrides: { pink: '#ff0000' } });
    const notOverridden = buildThemeStyle({ accentColor: '#0000ff' });
    const pinkLine = (css: string) => css.match(/--accent-pink: (oklch\([^)]+\));/)?.[1];
    const chart2Line = (css: string) => css.match(/--chart-2: (oklch\([^)]+\));/)?.[1];
    expect(pinkLine(overridden)).not.toBe(pinkLine(notOverridden));
    expect(chart2Line(overridden)).toBe(chart2Line(notOverridden));
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
  it('keeps the 5 accent families visually distinct', () => {
    const palette = previewPalette({ accentColor: '#0000ff' }, 'light');
    const swatches = Object.values(palette.accents).map((a) => a.swatch);
    expect(new Set(swatches).size).toBe(5);
  });

  it('falls back to the default palette hue when no colors are set', () => {
    const light = previewPalette({}, 'light');
    const dark = previewPalette({}, 'dark');
    expect(light.background).not.toBe(dark.background);
  });
});
