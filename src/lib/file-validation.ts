// Shared between src/lib/storage.ts (server, authoritative) and
// src/components/ui/file-dropzone.tsx (client, immediate feedback) so the
// two never drift — deliberately has no server-only imports so it's safe to
// bundle for the browser.
export const MAX_BRANDING_FILE_SIZE_BYTES = 2 * 1024 * 1024;

export const BRANDING_MIME_TYPES = ['image/png', 'image/jpeg', 'image/x-icon', 'image/vnd.microsoft.icon'];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateBrandingFile(file: File): FileValidationResult {
  if (!BRANDING_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: `Formato de imagen no soportado: ${file.type || 'desconocido'}` };
  }
  if (file.size > MAX_BRANDING_FILE_SIZE_BYTES) {
    return { valid: false, error: 'La imagen supera el tamaño máximo permitido (2MB).' };
  }
  return { valid: true };
}
