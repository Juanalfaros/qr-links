import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { setupSchema } from '@/lib/schemas/setup';
import { firstErrorMessage } from '@/lib/schemas/validate';
import { uploadBrandingAsset, BrandingAssetError } from '@/lib/storage';
import { parseNullableNumberField } from '@/lib/schemas/form-fields';

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
    hue: parseNullableNumberField(formData.get('hue')),
  });
  if (!parsed.success) {
    const isEmailIssue = parsed.error.issues.some((issue) => issue.path[0] === 'email');
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed), ...(isEmailIssue && { field: 'email' }) }), {
      status: 400,
    });
  }
  const { email, password, companyName, hue } = parsed.data;

  const logoFile = formData.get('logo');
  const faviconFile = formData.get('favicon');

  try {
    const [logoUrl, faviconUrl] = await Promise.all([
      logoFile instanceof File ? uploadBrandingAsset(admin, 'logo', logoFile) : Promise.resolve(null),
      faviconFile instanceof File ? uploadBrandingAsset(admin, 'favicon', faviconFile) : Promise.resolve(null),
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
        ...(hue !== undefined && { brand_hue: hue }),
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
