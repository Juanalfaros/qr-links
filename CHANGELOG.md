# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [0.3.1] - 2026-07-23

### Cambiado

- Las ~36 migraciones SQL incrementales (`supabase/migrations/0001` a `0036`) se consolidan en un único archivo, `supabase/migrations/0001_baseline.sql`, que crea directamente el schema final — sin recrear pasos intermedios que una migración posterior modificó o revirtió (funciones reescritas varias veces, columnas agregadas y luego eliminadas, vistas reemplazadas por funciones, etc.). Una instalación nueva ahora solo corre un archivo en vez de 36. Las migraciones originales quedan en `supabase/migrations_archive/` como referencia histórica; no se aplican en ninguna instalación. **No afecta instancias ya desplegadas** — su schema ya aplicado no cambia.

## [0.3.0] - 2026-07-23

### Cambiado

- Personalización de apariencia rediseñada: el slider de un solo número (0-359) para el "hue de marca" se reemplaza por selectores de color reales (`<input type="color">`) para color primario y color de acento, con overrides individuales opcionales para cada uno de los 5 colores secundarios (amarillo/rosa/verde/azul/lila) y un preview en vivo mostrando claro y oscuro lado a lado. Sigue siendo OKLCH por debajo (solo se usa el matiz de cada color elegido, la luminosidad/saturación siempre vienen de la paleta ya afinada), pero ahora con feedback visual real en vez de un número sin contexto.

### Corregido

- El toggle de tema (claro/oscuro) no respondía al click en `/login`, `/setup`, `/forgot-password` y `/reset-password`: el contenedor centrado del formulario (sin `z-index`) tapaba el botón al pintarse después en el DOM.

## [0.2.0] - 2026-07-23

### Agregado

- Personalización de apariencia desde el panel de superadmin: color de marca (rota el hue de toda la paleta OKLCH preservando contraste), redondeo de esquinas, estilo del sidebar (oscuro/color de marca) y color de QR por defecto — con selector de color de marca opcional también en `/setup`.
- Guarda de "último superadmin": ya no se puede degradar o quitarle el rol al único superadmin restante (validado en la ruta y con un trigger de base de datos como red de seguridad).
- Validación de host para `webhook_url` de links: bloquea que apunte a `localhost` o rangos de IP privados/loopback/link-local (mitiga SSRF).

### Corregido (seguridad)

- Neutralización de inyección de fórmulas (`=`, `+`, `-`, `@`) en las exportaciones CSV de analíticas.
- `notify_email` de las reglas de alerta ahora debe corresponder al email de un usuario existente en la instancia, no cualquier dirección.
- `avatar_url` del perfil validado como URL real.
- Se quitó `image/svg+xml` del allowlist de subida de logo/favicon (mitiga XSS almacenado servido desde el bucket público de branding).
- Namespacing de claves de rate-limit por ruta (redirect y forgot-password ya no comparten balde).
- Una fecha inválida en el export CSV de analíticas ahora responde 400 en vez de romper con un 500.
- El RPC de cuota diaria de creación de links ya no confía en un `p_user_id` arbitrario cuando la llamada viene de una sesión autenticada.

### Mejorado (UX del onboarding)

- Mensajes de error del wizard de `/setup` en español.
- El widget de Turnstile ahora limpia el token al expirar y muestra un error si falla, en vez de quedar en un estado inconsistente.
- Un error de email duplicado en el submit final vuelve al usuario al paso 1 en vez de mostrar el error sin contexto.
- Si la cuenta se crea pero el inicio de sesión automático falla, se muestra una pantalla clara con link a `/login` en vez de dejar el formulario en un estado ambiguo.
- Preview de imagen real y validación de tipo/tamaño en el momento de soltar el archivo, no recién al enviar el formulario.
- Accesibilidad: errores anunciados con `role="alert"`, descripción de paso con `aria-live`.
- El estado vacío del listado de links ahora tiene su propio botón para crear el primer link.

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
