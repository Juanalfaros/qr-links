import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { setupSchema } from '@/lib/schemas/setup';
import { firstErrorMessage } from '@/lib/schemas/validate';
import { uploadBrandingAsset, BrandingAssetError } from '@/lib/storage';
import { parseNullableStringField } from '@/lib/schemas/form-fields';

export const POST: APIRoute = async ({ request }) => {
  const admin = createSupabaseAdminClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // Re-check here (not just in middleware) so a replayed/direct request
  // can't create a second superadmin on an already-configured instance —
  // this is a one-time bootstrap action, not a high-concurrency route, so a
  // plain sequential check is enough (no atomic lock needed).
  const { data: needsOnboarding } = await admin.rpc('onboarding_needed');
  if (!needsOnboarding) {
    return new Response(JSON.stringify({ error: 'Ya se completó la configuración inicial' }), { status: 409 });
  }

  const formData = await request.formData();
  const parsed = setupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    companyName: formData.get('companyName'),
    primaryColor: parseNullableStringField(formData.get('primaryColor')),
    accentColor: parseNullableStringField(formData.get('accentColor')),
  });
  if (!parsed.success) {
    const isEmailIssue = parsed.error.issues.some((issue) => issue.path[0] === 'email');
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed), ...(isEmailIssue && { field: 'email' }) }), {
      status: 400,
    });
  }
  const { email, password, companyName, primaryColor, accentColor } = parsed.data;

  const logoFile = formData.get('logo');
  const faviconFile = formData.get('favicon');
  const pwaIcon192File = formData.get('pwaIcon192');
  const pwaIcon512File = formData.get('pwaIcon512');
  const pwaIcon512MaskableFile = formData.get('pwaIcon512Maskable');

  try {
    const [logoUrl, faviconUrl, pwaIcon192Url, pwaIcon512Url, pwaIcon512MaskableUrl] = await Promise.all([
      logoFile instanceof File ? uploadBrandingAsset(admin, 'logo', logoFile) : Promise.resolve(null),
      faviconFile instanceof File ? uploadBrandingAsset(admin, 'favicon', faviconFile) : Promise.resolve(null),
      pwaIcon192File instanceof File
        ? uploadBrandingAsset(admin, 'pwa-icon-192', pwaIcon192File)
        : Promise.resolve(null),
      pwaIcon512File instanceof File
        ? uploadBrandingAsset(admin, 'pwa-icon-512', pwaIcon512File)
        : Promise.resolve(null),
      pwaIcon512MaskableFile instanceof File
        ? uploadBrandingAsset(admin, 'pwa-icon-512-maskable', pwaIcon512MaskableFile)
        : Promise.resolve(null),
    ]);

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      // The only realistic failure here (email format is already validated
      // above) is a duplicate/already-registered email — flag it so the
      // client can send the user back to the email field on step 1.
      return new Response(
        JSON.stringify({ error: createError?.message ?? 'No se pudo crear la cuenta', field: 'email' }),
        { status: 500 },
      );
    }

    const { error: promoteError } = await admin
      .from('profiles')
      .update({ role: 'superadmin' })
      .eq('id', created.user.id);
    if (promoteError) {
      return new Response(JSON.stringify({ error: promoteError.message }), { status: 500 });
    }

    const { error: brandingError } = await admin
      .from('branding_settings')
      .update({
        name: companyName,
        ...(logoUrl && { logo_url: logoUrl }),
        ...(faviconUrl && { favicon_url: faviconUrl }),
        ...(pwaIcon192Url && { pwa_icon_192_url: pwaIcon192Url }),
        ...(pwaIcon512Url && { pwa_icon_512_url: pwaIcon512Url }),
        ...(pwaIcon512MaskableUrl && { pwa_icon_512_maskable_url: pwaIcon512MaskableUrl }),
        ...(primaryColor !== undefined && { primary_color: primaryColor }),
        ...(accentColor !== undefined && { accent_color: accentColor }),
      })
      .eq('id', 1);
    if (brandingError) {
      return new Response(JSON.stringify({ error: brandingError.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ email }), { status: 201 });
  } catch (err) {
    if (err instanceof BrandingAssetError) {
      return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
    throw err;
  }
};
