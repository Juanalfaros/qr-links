import { describe, expect, it } from 'vitest';
import { buildThemeStyle, rotateHue } from './theme';

describe('buildThemeStyle', () => {
  it('returns an empty string when nothing is set', () => {
    expect(buildThemeStyle({})).toBe('');
    expect(buildThemeStyle({ hue: null, radiusRem: null, sidebarStyle: null })).toBe('');
  });

  it('reproduces the base palette values exactly at the anchor hue (245)', () => {
    // hue=245 is the anchor — rotation delta is 0, so every rotated/direct
    // token should come out matching src/styles/global.css's own :root/.dark
    // values verbatim, even though a CSS block is still emitted.
    const css = buildThemeStyle({ hue: 245, sidebarStyle: 'dark' });
    expect(css).toContain('--accent-blue: oklch(0.9 0.06 245);');
    expect(css).toContain('--primary: oklch(0.24 0.012 245);');
    expect(css).not.toContain('--sidebar:');
  });

  it('emits :root and .dark blocks with the rotated hue for a non-anchor hue', () => {
    const css = buildThemeStyle({ hue: 0 });
    expect(css).toContain(':root {');
    expect(css).toContain('.dark {');
    // accent-blue's light-mode hue is 245 (the anchor) — rotating to brand
    // hue 0 should yield hue 0 exactly.
    expect(css).toMatch(/--accent-blue: oklch\(0\.9 0\.06 0\);/);
    // --primary adopts the hue directly, not rotated.
    expect(css).toMatch(/--primary: oklch\(0\.24 0\.012 0\);/);
  });

  it('keeps the 5 chart hues distinct after rotating', () => {
    const css = buildThemeStyle({ hue: 30 });
    const hues = [...css.matchAll(/--chart-\d: oklch\([\d.]+ [\d.]+ ([\d.]+)\)/g)].map((m) => Number(m[1]));
    expect(hues).toHaveLength(10); // 5 in :root + 5 in .dark
    expect(new Set(hues.slice(0, 5)).size).toBe(5);
  });

  it('only overrides sidebar tokens when sidebarStyle is "brand"', () => {
    expect(buildThemeStyle({ hue: 10, sidebarStyle: 'dark' })).not.toContain('--sidebar:');
    expect(buildThemeStyle({ hue: 10, sidebarStyle: 'brand' })).toContain('--sidebar:');
  });

  it('emits only --radius when just radiusRem is set', () => {
    expect(buildThemeStyle({ radiusRem: 0.5 })).toBe(':root {\n  --radius: 0.5rem;\n}\n');
  });

  it('clamps radiusRem to [0, 2] and rounds/normalizes hue defensively', () => {
    expect(buildThemeStyle({ radiusRem: 5 })).toContain('--radius: 2rem;');
    expect(buildThemeStyle({ radiusRem: -1 })).toContain('--radius: 0rem;');
    expect(buildThemeStyle({ hue: 720 + 10 })).toContain(oklchHueFragment(10));
  });
});

function oklchHueFragment(hue: number): string {
  return ` ${hue})`;
}

describe('rotateHue', () => {
  it('is the identity at the anchor hue (245)', () => {
    expect(rotateHue(95, 245)).toBe(95);
    expect(rotateHue(350, 245)).toBe(350);
  });

  it('wraps around 360', () => {
    expect(rotateHue(350, 245 + 20)).toBe(10);
    expect(rotateHue(10, 245 - 20)).toBe(350);
  });
});
