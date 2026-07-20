function escapeCsvValue(value: string | number | null): string {
  const str = String(value ?? '');
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(','));
  return lines.join('\r\n');
}
