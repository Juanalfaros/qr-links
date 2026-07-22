# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [0.1.0] - 2026-07-21

### Agregado

- Onboarding inicial en `/setup`: crea la primera cuenta de superadmin y configura nombre/logo/favicon de la empresa, reemplazando el paso manual de SQL Editor documentado antes en el README.
- Branding (nombre, logo, favicon, prefijo de tokens de API) movido de código hardcodeado a Supabase (`branding_settings`), editable en cualquier momento desde el tab "Branding" del panel de superadmin. Logo y favicon se suben como archivo real (Supabase Storage).
- Recuperación de contraseña self-service (`/forgot-password` → `/reset-password`), con rate-limit por IP.
- Cambio de contraseña desde el perfil, con re-verificación de la contraseña actual antes de aplicar el cambio.
- Zona de peligro (solo superadmin): borra todo el contenido de la app (links, analíticas, tags, alertas, notificaciones, tokens, dominios permitidos/bloqueados, departamentos, auditoría), preservando cuentas de usuario y branding — requiere frase de confirmación exacta + contraseña actual.
- Prefijo de tokens de API (`token_prefix`) configurable por instancia; no afecta tokens ya emitidos.
- Medidor de fuerza de contraseña (largo + variedad de caracteres, sin exigir composición rígida) y toggle de mostrar/ocultar en todos los campos de contraseña de la app.
- Componente `FileDropzone` reutilizable (arrastrar y soltar) para los campos de logo/favicon.

### Cambiado

- El proyecto se renombra de `qr-gyg` a `qr-link`.
- El repo público queda genérico por defecto: sin nombre de empresa, logo ni prefijo de token hardcodeados — cada instancia se configura sola desde `/setup` y el panel de superadmin.

## [0.0.1] - 2026-07-20

Versión inicial: acortador de links + generador de QR con analíticas, roles de usuario/superadmin, gestión de dominios, alertas y digest por email.
