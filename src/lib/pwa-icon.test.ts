import { describe, expect, it } from 'vitest';
import { computeIconLayout } from './pwa-icon';

describe('computeIconLayout', () => {
  it('centers a square source filling the full target when safeZoneRatio is 1', () => {
    const layout = computeIconLayout(100, 100, 512, 1);
    expect(layout).toEqual({ dx: 0, dy: 0, dw: 512, dh: 512 });
  });

  it('contain-fits a non-square source, centering the shorter axis', () => {
    // 2:1 landscape source into a square target — width fills, height centers.
    const layout = computeIconLayout(200, 100, 512, 1);
    expect(layout.dw).toBeCloseTo(512, 5);
    expect(layout.dh).toBeCloseTo(256, 5);
    expect(layout.dx).toBeCloseTo(0, 5);
    expect(layout.dy).toBeCloseTo(128, 5);
  });

  it('shrinks content to the safe zone and centers it for maskable icons', () => {
    const layout = computeIconLayout(100, 100, 512, 0.8);
    expect(layout.dw).toBeCloseTo(409.6, 1);
    expect(layout.dh).toBeCloseTo(409.6, 1);
    // Centered: equal margin on both sides.
    expect(layout.dx).toBeCloseTo(layout.dy, 5);
    expect(layout.dx).toBeCloseTo((512 - layout.dw) / 2, 5);
  });

  it('scales a portrait source down to fit within the target square', () => {
    const layout = computeIconLayout(133.33, 153.62, 192, 1);
    expect(layout.dh).toBeCloseTo(192, 1);
    expect(layout.dw).toBeLessThan(192);
    expect(layout.dx).toBeGreaterThan(0);
    expect(layout.dy).toBeCloseTo(0, 5);
  });
});
