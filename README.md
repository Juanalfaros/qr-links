# qr-link

Acortador de enlaces dinámico y generador de códigos QR corporativo, multiusuario, con roles de usuario y superadmin.

**Stack**: [Astro](https://astro.build) (SSR) + [Cloudflare Workers](https://developers.cloudflare.com/workers/) + [Supabase](https://supabase.com) (Postgres + Auth) + React (islands) + [shadcn/ui](https://ui.shadcn.com) sobre [Base UI](https://base-ui.com) + Tailwind CSS v4 + [Hugeicons](https://hugeicons.com).

## Funcionalidad

- Onboarding inicial en `/setup`: crea la primera cuenta de superadmin y configura nombre/logo/favicon de la empresa (persistido en Supabase) sin tocar código ni variables de entorno.
- Branding editable en cualquier momento desde el panel de superadmin (nombre, logo, favicon, prefijo de tokens de API) — el repo público no lleva ningún dato de marca hardcodeado.
- Personalización de apariencia (panel de superadmin, y opcionalmente en `/setup`): color de marca, redondeo de esquinas, estilo del sidebar y color de QR por defecto — todo el sistema de diseño es OKLCH, así que un solo hue rota toda la paleta preservando contraste en ambos temas.
- Login/logout con sesión basada en cookies (Supabase Auth), recuperación de contraseña self-service (`/forgot-password` → `/reset-password`) y cambio de contraseña desde el perfil.
- Cada usuario crea, edita, archiva y elimina sus propios links, con código corto autogenerado o personalizado.
- Generación de QR en PNG y SVG, con descarga directa.
- Redirect público (`/[code]`) que registra analíticas (país, ciudad, dispositivo, OS, browser, UTM) de forma asíncrona sin bloquear el redirect.
- Analíticas por link: clics totales, desglose por país/dispositivo, clics en el tiempo.
- Panel de superadmin: gestión de usuarios y roles, invitar nuevos usuarios, vista global de todos los links de la empresa, analíticas consolidadas de toda la empresa (mapa mundial, KPIs, desgloses), alertas configurables, digest semanal por email, y una "zona de peligro" para borrar todo el contenido de la app (preservando cuentas y branding) con doble confirmación.
- Tokens de API personales para integraciones externas, con prefijo configurable por instancia.
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

4. Copia `.dev.vars.example` a `.dev.vars` y completa los valores reales. **Nada de este archivo se commitea** (está en `.gitignore`) — es la única fuente de valores específicos de tu instancia, tanto en desarrollo como los que luego replicás en producción:

   ```sh
   cp .dev.vars.example .dev.vars
   ```

   ```
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   RESEND_API_KEY=...
   PUBLIC_SITE_URL=http://localhost:4321
   PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
   RESEND_FROM_EMAIL=...
   RATE_LIMIT_KV_ID=...
   ```

   `RESEND_API_KEY` solo lo usan los digests/alertas por email (ver [Resend y Cron Triggers](#resend-y-cron-triggers) más abajo) — dejarlo con un valor placeholder no rompe nada más, esos correos simplemente no se envían.

5. Crea el namespace de KV para el rate-limit del redirect público (gratis: 100k lecturas/1k escrituras por día):

   ```sh
   pnpm exec wrangler login
   pnpm exec wrangler kv namespace create RATE_LIMIT_KV
   ```

   Copia el `id` que te devuelve a `RATE_LIMIT_KV_ID` en tu `.dev.vars`.

6. Genera `wrangler.jsonc` a partir de `wrangler.template.jsonc` (tampoco se commitea — se regenera con este comando cada vez que cambie algún valor en `.dev.vars`):

   ```sh
   pnpm wrangler:config
   ```

7. Regenera los tipos de Cloudflare/Wrangler (lee `wrangler.jsonc` + `.dev.vars` para el shape de `Env`):

   ```sh
   pnpm exec wrangler types
   ```

8. Levanta el servidor de desarrollo (esto ya corre `wrangler:config` automáticamente, así que solo hace falta repetir el paso 6 a mano si cambiás algo en `.dev.vars` mientras el server está corriendo):

   ```sh
   pnpm dev
   ```

9. Abre el sitio (`http://localhost:4321` en desarrollo, o tu dominio en producción). Como todavía no existe ningún superadmin, serás redirigido automáticamente a `/setup` — ahí creas la cuenta de administrador y configuras el nombre/logo/favicon de la empresa (se guardan en Supabase, no hace falta tocar código ni variables de entorno). Una vez completado, `/setup` deja de estar accesible.

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

El adaptador `@astrojs/cloudflare` despliega a **Cloudflare Workers** (no Cloudflare Pages, que ya no es soportado por este adaptador). La forma recomendada es conectar el repositorio en el dashboard de Cloudflare (**Workers & Pages → Workers Builds**) para build/deploy automático en cada push. Build command: `pnpm build`. Deploy command: `npx wrangler deploy`.

`wrangler.jsonc` **no está en el repo** (se genera desde `wrangler.template.jsonc`, ver "Setup local" arriba) — esto es deliberado: así ningún valor específico de una instancia (dominio, id de KV namespace, etc.) queda expuesto en el repo público para quien lo clone. Esto significa que hay dos tipos de configuración a cargar en Cloudflare antes de desplegar, y son distintos:

- **Variable de entorno de build** (Workers Builds → tu proyecto → Settings → Build → Variables, no "secrets" del Worker): `RATE_LIMIT_KV_ID` con el id real del namespace (`wrangler kv namespace create RATE_LIMIT_KV`). El build (`pnpm build`) la necesita para generar `wrangler.jsonc` _antes_ de que `wrangler deploy` lo lea — un Worker secret no serviría acá porque esos solo existen en el runtime del Worker ya desplegado, no durante el build.
- **Secrets del Worker** (dashboard del Worker → Settings → Variables and Secrets, o `wrangler secret put <NAME>` — estos si nunca van en el repo): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `PUBLIC_SITE_URL` (tu dominio real, no el placeholder de dev), `PUBLIC_TURNSTILE_SITE_KEY`, `RESEND_FROM_EMAIL`.

### Resend y Cron Triggers

El resumen semanal de clics y las alertas configurables (tab "Alertas" del panel de superadmin) se envían por email vía [Resend](https://resend.com) (tier gratis: 3000 emails/mes, 100/día, 1 dominio verificado), disparados por dos Cron Triggers de Cloudflare (gratis: 5 por cuenta) — ver `wrangler.jsonc` (`triggers.crons`) y `src/worker-entry.ts`.

Para activarlos en producción:

1. Verifica un dominio en el dashboard de Resend y genera un API key.
2. `wrangler secret put RESEND_API_KEY`.
3. `wrangler secret put RESEND_FROM_EMAIL` con una dirección de ese dominio verificado.

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
scripts/
  generate-wrangler-config.mjs  # wrangler.template.jsonc + .dev.vars -> wrangler.jsonc (gitignored)
```

## Changelog

Ver [CHANGELOG.md](CHANGELOG.md) para el historial de cambios.
