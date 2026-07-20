/// <reference types="astro/client" />
// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- worker-configuration.d.ts only declares ambient globals (ExecutionContext, Env), it has no exports to `import`
/// <reference path="../worker-configuration.d.ts" />

declare namespace App {
  interface Locals {
    cfContext: ExecutionContext;
    supabase: import('@supabase/supabase-js').SupabaseClient;
    user: { id: string; email: string; role: import('./lib/types').UserRole } | null;
  }
}
