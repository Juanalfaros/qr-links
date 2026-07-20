import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ locals, redirect }) => {
  if (locals.supabase) {
    await locals.supabase.auth.signOut();
  }
  return redirect('/login');
};
