import type { SupabaseClient } from '@supabase/supabase-js';
import { validateBrandingFile } from './file-validation';

// SVG deliberately excluded: this bucket is public, so an uploaded SVG would
// be served from the Supabase storage domain and could carry a <script>/
// event-handler payload — a stored-XSS vector. Raster-only avoids that whole
// class of issue.
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
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
  slot: 'logo' | 'favicon' | 'pwa-icon-192' | 'pwa-icon-512' | 'pwa-icon-512-maskable',
  file: File,
): Promise<string> {
  const validation = validateBrandingFile(file);
  if (!validation.valid) {
    throw new BrandingAssetError(validation.error);
  }

  const extension = EXTENSION_BY_MIME_TYPE[file.type];
  if (!extension) {
    throw new BrandingAssetError(`Formato de imagen no soportado: ${file.type || 'desconocido'}`);
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
