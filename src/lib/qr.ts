// Tags a URL as scanned-via-QR (vs. clicked/pasted as a plain link) so
// [code].astro can attribute the resulting analytics row to the right
// channel. Uses the URL API rather than string concatenation so it's safe
// regardless of whether `url` already has query params.
export function appendQrSourceParam(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set('src', 'qr');
    return u.toString();
  } catch {
    return url;
  }
}
