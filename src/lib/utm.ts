export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export function appendUtmParams(url: string, params: UtmParams): string {
  const entries = Object.entries(params).filter(([, v]) => v && v.trim());
  if (entries.length === 0) return url;

  try {
    const u = new URL(url);
    for (const [key, value] of entries) u.searchParams.set(key, value!.trim());
    return u.toString();
  } catch {
    // Invalid URL — let the normal destination_url validation surface the error.
    return url;
  }
}
