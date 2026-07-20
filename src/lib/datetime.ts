/** Converts a stored UTC ISO timestamp into the local value an `<input type="datetime-local">` expects. */
export function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

/**
 * Converts an `<input type="datetime-local">` value back to a UTC ISO string.
 * The browser parses a timezone-less "YYYY-MM-DDTHH:mm" string as local time,
 * so `Date.toISOString()` here correctly accounts for the user's timezone.
 */
export function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}
