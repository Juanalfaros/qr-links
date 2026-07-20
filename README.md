# qr-gyg

Acortador de enlaces dinámico y generador de códigos QR corporativo, multiusuario, con roles de usuario y superadmin.

**Stack**: [Astro](https://astro.build) (SSR) + [Cloudflare Workers](https://developers.cloudflare.com/workers/) + [Supabase](https://supabase.com) (Postgres + Auth) + React (islands) + [shadcn/ui](https://ui.shadcn.com) sobre [Base UI](https://base-ui.com) + Tailwind CSS v4 + [Hugeicons](https://hugeicons.com).

## Funcionalidad

- Login/logout con sesión basada en cookies (Supabase Auth).
- Cada usuario crea, edita, archiva y elimina sus propios links, con código corto autogenerado o personalizado.
- Generación de QR en PNG y SVG, con descarga directa.
- Redirect público (`/[code]`) que registra analíticas (país, ciudad, dispositivo, OS, browser, UTM) de forma asíncrona sin bloquear el redirect.
- Analíticas por link: clics totales, desglose por país/dispositivo, clics en el tiempo.
- Panel de superadmin: gestión de usuarios y roles, invitar nuevos usuarios, vista global de todos los links de la empresa, analíticas consolidadas de toda la empresa (mapa mundial, KPIs, desgloses), alertas configurables y digest semanal por email.
- Dark/light mode con persistencia.
- Layout responsivo (sidebar colapsa a drawer en móvil, tablas colapsan a cards).

## Requisitos

- [pnpm](https://pnpm.io) (no usar npm/yarn en este proyecto).
- Una cuenta gratuita en [supabase.com](https://supabase.com).
- Una cuenta gratuita en [Cloudflare](https://dash.cloudflare.com) para desplegar.

## Setup local

1. Instala dependencias:

   ```sh
   pnpm install
   ```

2. Crea un proyecto en [supabase.com/dashboard](https://supabase.com/dashboard). Cuando esté listo, ve a **Project Settings → API** y copia: Project URL, `anon` public key, y `service_role` key.

3. Aplica las migraciones en orden. Cópialas desde `supabase/migrations/*.sql` (en orden numérico) y pégalas en el **SQL Editor** del dashboard de Supabase, o usa el [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase link` + `supabase db push`).

4. Copia `.dev.vars.example` a `.dev.vars` y completa los valores reales:

   ```sh
   cp .dev.vars.example .dev.vars
   ```

   ```
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   RESEND_API_KEY=...
   ```

   `RESEND_API_KEY` solo lo usan los digests/alertas por email (ver [Resend y Cron Triggers](#resend-y-cron-triggers) más abajo) — dejarlo con un valor placeholder no rompe nada más, esos correos simplemente no se envían.

5. Regenera los tipos de Cloudflare/Wrangler (lee `.dev.vars` para el shape de `Env`):

   ```sh
   pnpm exec wrangler types
   ```

6. Levanta el servidor de desarrollo:

   ```sh
   pnpm dev
   ```

7. Crea tu primer superadmin: registra un usuario normalmente (o créalo desde **Authentication → Users → Add user** en el dashboard de Supabase), luego promuévelo desde el **SQL Editor**:
   ```sql
   update public.profiles set role = 'superadmin' where email = 'tu-correo@ejemplo.com';
   ```

## Comandos

| Comando                 | Acción                                                                         |
| :---------------------- | :----------------------------------------------------------------------------- |
| `pnpm dev`              | Servidor de desarrollo en `localhost:4321` (corre sobre workerd real, no Node) |
| `pnpm build`            | Build de producción a `./dist/`                                                |
| `pnpm preview`          | Sirve el build de producción localmente                                        |
| `pnpm exec astro check` | Type-check completo (Astro + TypeScript)                                       |
| `pnpm lint`             | ESLint                                                                         |
| `pnpm format`           | Prettier (escribe cambios)                                                     |
| `pnpm test`             | Tests unitarios (Vitest)                                                       |
| `pnpm test:e2e`         | Tests end-to-end (Playwright)                                                  |

## Deploy

El adaptador `@astrojs/cloudflare` despliega a **Cloudflare Workers** (no Cloudflare Pages, que ya no es soportado por este adaptador). La forma recomendada es conectar el repositorio en el dashboard de Cloudflare (**Workers & Pages → Workers Builds**) para build/deploy automático en cada push.

Los secrets de producción (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) se configuran en el dashboard de Cloudflare Workers o vía `wrangler secret put <NAME>` — nunca en el repo.

Antes de imprimir cualquier QR real, reemplaza el placeholder `PUBLIC_SITE_URL` en `wrangler.jsonc`/dashboard por el dominio real de producción.

### Resend y Cron Triggers

El resumen semanal de clics y las alertas configurables (tab "Alertas" del panel de superadmin) se envían por email vía [Resend](https://resend.com) (tier gratis: 3000 emails/mes, 100/día, 1 dominio verificado), disparados por dos Cron Triggers de Cloudflare (gratis: 5 por cuenta) — ver `wrangler.jsonc` (`triggers.crons`) y `src/worker-entry.ts`.

Para activarlos en producción:

1. Verifica un dominio en el dashboard de Resend y genera un API key.
2. `wrangler secret put RESEND_API_KEY`.
3. Reemplaza `RESEND_FROM_EMAIL` en `wrangler.jsonc` por una dirección de ese dominio verificado.

Este proyecto usa un entrypoint de Worker personalizado (`src/worker-entry.ts`) en vez del que trae el adaptador por defecto, precisamente para poder exportar un handler `scheduled` junto al `fetch` de Astro — es el patrón documentado por `@astrojs/cloudflare` para Cron Triggers.

### Exportar reportes

Cada link tiene botones "Exportar CSV" y "Exportar PDF" en su página de analíticas (`pdf-lib`, sin dependencias nativas — corre bien en Workers).

## Estructura del proyecto

```
src/
  components/       # Componentes React por dominio (links, admin, analytics, qr, layout, auth) + ui/ (primitivas shadcn/Base UI)
  layouts/          # BaseLayout.astro, DashboardLayout.astro
  lib/              # Supabase clients, schemas de validación (zod), utilidades
  pages/            # Rutas de Astro (incluye api/ para las rutas de servidor)
  middleware.ts     # Resolución de sesión y protección de rutas /admin, /superadmin
supabase/
  migrations/       # Migraciones SQL en orden numérico
```
