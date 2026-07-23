// Shared FormData → zod-input helpers for the branding appearance fields
// (used by both /api/setup and /api/admin/branding). HTML forms can't send
// a literal `null`, so the convention is: field absent from the FormData at
// all → `undefined` (schema treats it as "leave unchanged"); field present
// but an empty string → `null` (explicit clear, back to the hardcoded
// default).
export function parseNullableNumberField(value: FormDataEntryValue | null): number | null | undefined {
  if (value === null) return undefined;
  const str = String(value).trim();
  return str === '' ? null : Number(str);
}

export function parseNullableStringField(value: FormDataEntryValue | null): string | null | undefined {
  if (value === null) return undefined;
  const str = String(value).trim();
  return str === '' ? null : str;
}
