import { describe, expect, it } from 'vitest';
import { parseUserAgent } from './ua-parser';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const WINDOWS_EDGE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
const MAC_SAFARI_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

describe('parseUserAgent', () => {
  it('detects iOS correctly despite the "like Mac OS X" substring real iPhone UAs embed', () => {
    expect(parseUserAgent(IPHONE_UA)).toEqual({ os: 'iOS', browser: 'Safari', device: 'Mobile' });
  });

  it('detects Android + Chrome + Mobile', () => {
    expect(parseUserAgent(ANDROID_CHROME_UA)).toEqual({ os: 'Android', browser: 'Chrome', device: 'Mobile' });
  });

  it('detects Windows + Edge + Desktop, not Chrome (Edge UA also contains "Chrome/")', () => {
    expect(parseUserAgent(WINDOWS_EDGE_UA)).toEqual({ os: 'Windows', browser: 'Edge', device: 'Desktop' });
  });

  it('detects real macOS + Safari + Desktop', () => {
    expect(parseUserAgent(MAC_SAFARI_UA)).toEqual({ os: 'macOS', browser: 'Safari', device: 'Desktop' });
  });

  it('falls back to Unknown for an empty/unrecognized user agent', () => {
    expect(parseUserAgent('')).toEqual({ os: 'Unknown', browser: 'Unknown', device: 'Desktop' });
  });
});
