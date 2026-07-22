import type { SupabaseClient } from '@supabase/supabase-js';

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/svg+xml': 'svg',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
};

export class BrandingAssetError extends Error {}

// Shared by the pre-auth /api/setup (admin/service-role client, bypasses
// storage RLS the same way it bypasses table RLS) and the ongoing
// superadmin-only /api/admin/branding (RLS-scoped session client, gated by
// the branding_bucket_*_superadmin policies in
// 0029_branding_storage.sql). A fresh, unique path per upload avoids both
// filename collisions and stale browser/CDN caching of the old asset — no
// `upsert` needed. Old files are left orphaned in the bucket on replace;
// not worth cleanup logic for a single-row, low-frequency setting.
export async function uploadBrandingAsset(
  supabase: SupabaseClient,
  slot: 'logo' | 'favicon',
  file: File,
): Promise<string> {
  const extension = EXTENSION_BY_MIME_TYPE[file.type];
  if (!extension) {
    throw new BrandingAssetError(`Formato de imagen no soportado: ${file.type || 'desconocido'}`);
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new BrandingAssetError('La imagen supera el tamaño máximo permitido (2MB).');
  }

  const path = `${slot}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('branding').upload(path, file, { contentType: file.type });
  if (error) {
    throw new BrandingAssetError(error.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('branding').getPublicUrl(path);
  return publicUrl;
}
