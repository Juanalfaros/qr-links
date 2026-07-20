import { createBrowserClient } from '@supabase/ssr';

export const createSupabaseBrowserClient = (url: string, anonKey: string) => createBrowserClient(url, anonKey);
