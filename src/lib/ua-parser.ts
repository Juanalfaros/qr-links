export interface ParsedUA {
  device: string;
  os: string;
  browser: string;
}

// Order matters: real iOS user agents always embed "like Mac OS X" for legacy
// compatibility, so iphone/ipad/ipod must be checked before mac os x.
const OS_PATTERNS: [RegExp, string][] = [
  [/windows nt/i, 'Windows'],
  [/iphone|ipad|ipod/i, 'iOS'],
  [/mac os x/i, 'macOS'],
  [/android/i, 'Android'],
  [/linux/i, 'Linux'],
];

// Order matters: Edge/CriOS must be checked before Chrome/Safari, since both
// embed "Chrome/" and "Safari/" tokens in their own user-agent strings.
const BROWSER_PATTERNS: [RegExp, string][] = [
  [/edg\//i, 'Edge'],
  [/crios\//i, 'Chrome'],
  [/chrome\//i, 'Chrome'],
  [/firefox\//i, 'Firefox'],
  [/safari\//i, 'Safari'],
];

export function parseUserAgent(ua: string): ParsedUA {
  return {
    os: OS_PATTERNS.find(([re]) => re.test(ua))?.[1] ?? 'Unknown',
    browser: BROWSER_PATTERNS.find(([re]) => re.test(ua))?.[1] ?? 'Unknown',
    device: /mobile/i.test(ua) ? 'Mobile' : /tablet|ipad/i.test(ua) ? 'Tablet' : 'Desktop',
  };
}
