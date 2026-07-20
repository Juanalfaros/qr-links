import { describe, expect, it } from 'vitest';
import { generateShortCode } from './short-code';
import { siteConfig } from './config';

const AMBIGUOUS_CHARS = /[0O1lI]/;

describe('generateShortCode', () => {
  it('generates a code of the configured length', () => {
    expect(generateShortCode()).toHaveLength(siteConfig.shortCodeLength);
  });

  it('never includes visually ambiguous characters (0/O/1/l/I)', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateShortCode()).not.toMatch(AMBIGUOUS_CHARS);
    }
  });

  it('generates distinct codes across calls', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateShortCode()));
    expect(codes.size).toBe(50);
  });
});
