-- Línea base consolidada: reemplaza las ~36 migraciones incrementales que
-- llevaron el schema hasta este punto (historial completo disponible en git,
-- ver CHANGELOG.md). Este archivo único crea directamente el estado final —
-- ninguna instalación nueva necesita recrear pasos intermedios que una
-- migración posterior modificó o revirtió (funciones reescritas varias
-- veces, columnas agregadas y luego eliminadas, vistas reemplazadas por
-- funciones, etc.). Esto NO afecta ninguna instancia ya desplegada: sus
-- bases ya tienen este mismo esquema aplicado.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('user', 'superadmin', 'manager');

-- ============================================================================
-- TABLAS (en orden de dependencia por foreign key)
-- ============================================================================

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  department_id uuid references public.departments(id) on delete set null,
  full_name text,
  avatar_url text,
  suspended_at timestamptz
);

create table public.links (
  id uuid primary key default gen_random_uuid(),
  short_code text not null unique,
  destination_url text not null,
  title text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  is_pinned boolean not null default false,
  expires_at timestamptz,
  max_clicks int,
  click_count int not null default 0,
  password_hash text,
  show_interstitial boolean not null default false,
  webhook_url text,
  ga_tracking_id text
);

-- visitor_hash = sha256(link_id|cf-connecting-ip|day), computado en
-- [code].astro y nunca almacenado crudo — contar hashes distintos aproxima
-- visitantes únicos diarios sin cookies ni columna de IP.
-- channel: 'qr' si la URL trae `?src=qr` (generado por src/lib/qr.ts), si no 'link'.
create table public.analytics (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.links(id) on delete cascade,
  country text,
  city text,
  device text,
  os text,
  browser text,
  utm_source text,
  scanned_at timestamptz not null default now(),
  referrer text,
  visitor_hash text,
  channel text not null default 'link'
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.link_tags (
  link_id uuid not null references public.links(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (link_id, tag_id)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_table text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Cap diario de creación de links por usuario, incrementado atómicamente por
-- check_and_increment_link_quota() más abajo. Sin políticas RLS a propósito:
-- nunca se lee/escribe directo vía API, solo a través de esa función
-- SECURITY DEFINER.
create table public.link_creation_quota (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  window_start date not null default current_date,
  count int not null default 0
);

create table public.allowed_domains (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  created_at timestamptz not null default now()
);

create table public.blocked_url_patterns (
  id uuid primary key default gen_random_uuid(),
  pattern text not null unique,
  created_at timestamptz not null default now()
);

-- Revisadas cada hora por el Cron Trigger (src/worker-entry.ts) con la
-- service-role key — un job en background no tiene un "usuario actor" cuyo
-- RLS deba aplicarse, necesita ver las reglas de todos para chequearlas.
create table public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  -- null = alerta de toda la empresa (solo superadmin, ver policy de insert)
  link_id uuid references public.links(id) on delete cascade,
  threshold_count int not null,
  window_hours int not null default 24,
  notify_email text not null,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  link_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  token_hash text not null unique,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- Singleton: `id int primary key default 1 check (id = 1)` fuerza que exista
-- exactamente una fila (un segundo insert choca contra la PK). Sin políticas
-- de insert/delete — la única fila es la sembrada más abajo.
create table public.branding_settings (
  id int primary key default 1 check (id = 1),
  name text not null,
  logo_url text,
  favicon_url text,
  updated_at timestamptz not null default now(),
  token_prefix text not null default 'api_',
  radius_rem numeric(3, 2) check (radius_rem is null or radius_rem between 0 and 2),
  sidebar_style text check (sidebar_style is null or sidebar_style in ('dark', 'brand')),
  qr_dark_color text check (qr_dark_color is null or qr_dark_color ~* '^#[0-9a-f]{6}$'),
  primary_color text check (primary_color is null or primary_color ~* '^#[0-9a-f]{6}$'),
  accent_color text check (accent_color is null or accent_color ~* '^#[0-9a-f]{6}$'),
  accent_yellow_color text check (accent_yellow_color is null or accent_yellow_color ~* '^#[0-9a-f]{6}$'),
  accent_pink_color text check (accent_pink_color is null or accent_pink_color ~* '^#[0-9a-f]{6}$'),
  accent_green_color text check (accent_green_color is null or accent_green_color ~* '^#[0-9a-f]{6}$'),
  accent_blue_color text check (accent_blue_color is null or accent_blue_color ~* '^#[0-9a-f]{6}$'),
  accent_lilac_color text check (accent_lilac_color is null or accent_lilac_color ~* '^#[0-9a-f]{6}$')
);

insert into public.branding_settings (id, name, logo_url, favicon_url)
values (1, 'My Company', '/logo.svg', '/favicon.svg');

-- ============================================================================
-- ÍNDICES
-- ============================================================================

create index links_user_id_idx on public.links (user_id);
create index links_short_code_idx on public.links (short_code);

create index analytics_scanned_at_idx on public.analytics (scanned_at);
create index analytics_link_id_visitor_hash_idx on public.analytics (link_id, visitor_hash);
-- Sirve tanto "link_id solo" (link_id es la columna izquierda) como
-- "link_id + rango de scanned_at" (todas las funciones de analíticas por
-- link) con un solo index seek.
create index analytics_link_id_scanned_at_idx on public.analytics (link_id, scanned_at);

create index audit_log_created_at_idx on public.audit_log (created_at desc);
create index alert_rules_link_id_idx on public.alert_rules (link_id);
create index notifications_user_id_created_at_idx on public.notifications (user_id, created_at desc);
create index api_tokens_user_id_idx on public.api_tokens (user_id);

-- ============================================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================================

-- Gotcha: una policy sobre `profiles` que consulta `profiles` para chequear
-- el rol del caller recursa a través de RLS de nuevo. Se evita con un helper
-- SECURITY DEFINER (bypasea RLS internamente, seguro porque solo devuelve boolean).
create or replace function public.is_superadmin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'superadmin'
  );
$$;
revoke execute on function public.is_superadmin() from public;
grant execute on function public.is_superadmin() to authenticated;

-- Mismo patrón que is_superadmin(): SECURITY DEFINER para que una policy que
-- lo llame evaluando una fila de profiles/links no recurse por RLS de profiles.
create or replace function public.is_manager_of(p_department_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'manager' and department_id = p_department_id
  );
$$;
revoke all on function public.is_manager_of from public;
grant execute on function public.is_manager_of to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;
-- Función solo-para-trigger: Postgres otorga EXECUTE a PUBLIC por defecto al
-- crear la función, lo que la haría alcanzable directo vía
-- /rest/v1/rpc/handle_new_user. Los triggers no necesitan EXECUTE sobre el rol
-- que dispara el evento para ejecutarse, así que revocarlo solo cierra esa
-- vía de API directa.
revoke execute on function public.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger links_set_updated_at
  before update on public.links
  for each row execute function public.set_updated_at();

-- RLS no puede restringir qué *columnas* toca un UPDATE, así que la policy
-- profiles_update_self (más abajo) por sí sola dejaría que un caller
-- self-service cuele un cambio de role/email/department/suspension en la
-- misma sentencia. Este trigger es el backstop a nivel de columna — la ruta
-- PATCH /api/profile solo setea full_name/avatar_url, así que esto nunca
-- dispara en operación normal.
--
-- El primer chequeo (último superadmin) es incondicional — aplica incluso a
-- un actor superadmin o un actor nulo (escrituras de servicio/sistema),
-- porque no hay ningún actor para el que dejar la instancia con cero
-- superadmins sea el resultado deseado (onboarding_needed() reabre /setup a
-- anónimos apenas eso pasa). El resto de la función sí exime a
-- auth.uid() is null (escrituras de servicio/cascada, ej. borrar un
-- departamento con perfiles asignados dispara un UPDATE sin actor de sesión).
create or replace function public.guard_profile_self_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'superadmin' and new.role is distinct from 'superadmin' then
    if (select count(*) from public.profiles where role = 'superadmin') <= 1 then
      raise exception 'cannot demote the last remaining superadmin';
    end if;
  end if;

  if auth.uid() is not null and not public.is_superadmin() then
    if new.role is distinct from old.role then
      raise exception 'only a superadmin can change role';
    end if;
    if new.email is distinct from old.email then
      raise exception 'only a superadmin can change email';
    end if;
    if new.department_id is distinct from old.department_id then
      raise exception 'only a superadmin can change department';
    end if;
    if new.suspended_at is distinct from old.suspended_at then
      raise exception 'only a superadmin can change suspension status';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_profile_self_update() from public;

create trigger profiles_guard_self_update
  before update on public.profiles
  for each row execute function public.guard_profile_self_update();

-- Dos fuentes de eventos reales alimentan audit_log/notifications — nada
-- sintético/demo: (1) un cambio de rol/suspensión en el propio profile del
-- usuario afectado, (2) un alert_rules disparado (insertado directo por el
-- cron handler con service-role — ver src/lib/cron/alerts.ts).
create or replace function public.audit_profiles_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    insert into public.audit_log (actor_id, action, target_table, target_id, metadata)
    values (auth.uid(), 'role_changed', 'profiles', new.id, jsonb_build_object('from', old.role, 'to', new.role));

    insert into public.notifications (user_id, title, body)
    values (new.id, 'Tu rol cambió', format('Tu nuevo rol es "%s".', new.role));
  end if;
  if new.suspended_at is distinct from old.suspended_at then
    insert into public.audit_log (actor_id, action, target_table, target_id, metadata)
    values (
      auth.uid(),
      case when new.suspended_at is null then 'user_unsuspended' else 'user_suspended' end,
      'profiles',
      new.id,
      '{}'::jsonb
    );

    insert into public.notifications (user_id, title, body)
    values (
      new.id,
      case when new.suspended_at is null then 'Cuenta reactivada' else 'Cuenta suspendida' end,
      case
        when new.suspended_at is null then 'Tu cuenta fue reactivada y ya puedes volver a acceder.'
        else 'Tu cuenta fue suspendida por un administrador.'
      end
    );
  end if;
  return new;
end;
$$;
revoke all on function public.audit_profiles_changes() from public;

create trigger profiles_audit_changes
  after update on public.profiles
  for each row execute function public.audit_profiles_changes();

create or replace function public.audit_links_soft_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    insert into public.audit_log (actor_id, action, target_table, target_id, metadata)
    values (auth.uid(), 'link_deleted', 'links', new.id, jsonb_build_object('short_code', new.short_code));
  end if;
  return new;
end;
$$;
revoke all on function public.audit_links_soft_delete() from public;

create trigger links_audit_soft_delete
  after update on public.links
  for each row execute function public.audit_links_soft_delete();

-- Valida-e-incrementa atómicamente en una sola sentencia UPDATE...RETURNING
-- (el row lock que toma serializa hits concurrentes, así dos requests
-- simultáneos no pueden pasar ambos el max_clicks). El fallback de solo
-- lectura únicamente explica por qué no matcheó nada (not_found / expired /
-- limit_reached / password_required) — nunca toca click_count, sin riesgo de
-- carrera.
create function public.get_link_for_redirect(p_short_code text)
returns table (
  id uuid,
  destination_url text,
  status text,
  show_interstitial boolean,
  webhook_url text,
  ga_tracking_id text
)
language plpgsql security definer set search_path = public as $$
declare
  v_result record;
  v_existing record;
begin
  update public.links l
  set click_count = l.click_count + 1
  where l.short_code = p_short_code
    and l.deleted_at is null
    and (l.expires_at is null or l.expires_at > now())
    and (l.max_clicks is null or l.click_count < l.max_clicks)
    and l.password_hash is null
  returning l.id, l.destination_url, l.show_interstitial, l.webhook_url, l.ga_tracking_id into v_result;

  if found then
    return query select
      v_result.id, v_result.destination_url, 'ok'::text, v_result.show_interstitial,
      v_result.webhook_url, v_result.ga_tracking_id;
    return;
  end if;

  select l.id, l.expires_at, l.max_clicks, l.click_count, l.password_hash
    into v_existing
    from public.links l
    where l.short_code = p_short_code and l.deleted_at is null;

  if not found then
    return query select null::uuid, null::text, 'not_found'::text, null::boolean, null::text, null::text;
  elsif v_existing.expires_at is not null and v_existing.expires_at <= now() then
    return query select null::uuid, null::text, 'expired'::text, null::boolean, null::text, null::text;
  elsif v_existing.max_clicks is not null and v_existing.click_count >= v_existing.max_clicks then
    return query select null::uuid, null::text, 'limit_reached'::text, null::boolean, null::text, null::text;
  elsif v_existing.password_hash is not null then
    return query select v_existing.id, null::text, 'password_required'::text, null::boolean, null::text, null::text;
  else
    return query select null::uuid, null::text, 'not_found'::text, null::boolean, null::text, null::text;
  end if;
end;
$$;
revoke all on function public.get_link_for_redirect from public;
grant execute on function public.get_link_for_redirect to anon, authenticated;

-- Mismo patrón atómico que arriba, pero solo matchea cuando el hash bcrypt
-- (vía pgcrypto's crypt()) de la contraseña dada coincide con el guardado.
-- search_path incluye `extensions` porque Supabase instala pgcrypto ahí, no
-- en `public` — omitirlo hace que crypt()/gen_salt() no se puedan resolver.
create function public.verify_link_password(p_short_code text, p_password text)
returns table (
  id uuid,
  destination_url text,
  status text,
  show_interstitial boolean,
  webhook_url text,
  ga_tracking_id text
)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_result record;
begin
  update public.links l
  set click_count = l.click_count + 1
  where l.short_code = p_short_code
    and l.deleted_at is null
    and (l.expires_at is null or l.expires_at > now())
    and (l.max_clicks is null or l.click_count < l.max_clicks)
    and l.password_hash is not null
    and l.password_hash = crypt(p_password, l.password_hash)
  returning l.id, l.destination_url, l.show_interstitial, l.webhook_url, l.ga_tracking_id into v_result;

  if found then
    return query select
      v_result.id, v_result.destination_url, 'ok'::text, v_result.show_interstitial,
      v_result.webhook_url, v_result.ga_tracking_id;
  else
    return query select null::uuid, null::text, 'invalid_password'::text, null::boolean, null::text, null::text;
  end if;
end;
$$;
revoke all on function public.verify_link_password from public;
grant execute on function public.verify_link_password to anon, authenticated;

comment on function public.get_link_for_redirect(text) is
  'Valida un short_code para el redirect público e incrementa click_count atómicamente. anon+authenticated.';

-- Deliberadamente SECURITY INVOKER (el default): corre como el usuario que
-- llama, así la policy links_update_own_or_superadmin ya scopea este UPDATE
-- a links del caller — no hace falta un chequeo de ownership separado. Pasar
-- NULL/vacío limpia la contraseña. Nota: bcrypt (vía pgcrypto's
-- crypt()/gen_salt('bf')) trunca su input a 72 bytes — limitación estándar
-- del algoritmo, no un bug, y consistente con verify_link_password (mismo
-- crypt()), así que una contraseña más larga sigue verificando bien.
create or replace function public.set_link_password(p_link_id uuid, p_password text)
returns void language plpgsql set search_path = public, extensions as $$
begin
  update public.links
  set password_hash = case when p_password is null or p_password = '' then null else crypt(p_password, gen_salt('bf')) end
  where id = p_link_id;
end;
$$;
revoke all on function public.set_link_password from public;
grant execute on function public.set_link_password to authenticated;

comment on function public.set_link_password(uuid, text) is
  'Hashes p_password with bcrypt via pgcrypto crypt()/gen_salt(''bf''). Note: bcrypt truncates input to 72 bytes (standard algorithm limitation, not a bug) — consistent with verify_link_password, which hashes/compares the same way.';

comment on function public.verify_link_password(text, text) is
  'Compares p_password against the stored bcrypt hash via pgcrypto crypt(). Note: bcrypt truncates input to 72 bytes (standard algorithm limitation, not a bug) — consistent with set_link_password.';

create or replace function public.record_scan(
  p_link_id uuid, p_country text, p_city text, p_device text, p_os text, p_browser text, p_utm_source text,
  p_referrer text default null, p_visitor_hash text default null, p_channel text default 'link'
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.analytics (link_id, country, city, device, os, browser, utm_source, referrer, visitor_hash, channel)
  values (p_link_id, p_country, p_city, p_device, p_os, p_browser, p_utm_source, p_referrer, p_visitor_hash, p_channel);
end;
$$;
revoke all on function public.record_scan from public;
grant execute on function public.record_scan to anon, authenticated;

-- Funciones de analíticas por link (todas SECURITY INVOKER — `language sql`
-- sin declarar DEFINER — así respetan analytics_select_own_or_superadmin
-- igual que views con security_invoker=true).
create function public.get_link_analytics_daily(p_link_id uuid, p_from timestamptz default null, p_to timestamptz default null)
returns table (day date, clicks bigint)
language sql stable set search_path = public as $$
  select date_trunc('day', scanned_at)::date as day, count(*) as clicks
  from public.analytics
  where link_id = p_link_id
    and (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to)
  group by 1 order by 1;
$$;
revoke all on function public.get_link_analytics_daily from public;
grant execute on function public.get_link_analytics_daily to authenticated;

create function public.get_link_analytics_by_country(p_link_id uuid, p_from timestamptz default null, p_to timestamptz default null)
returns table (country text, clicks bigint)
language sql stable set search_path = public as $$
  select coalesce(country, 'Unknown') as country, count(*) as clicks
  from public.analytics
  where link_id = p_link_id
    and (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to)
  group by 1 order by 2 desc;
$$;
revoke all on function public.get_link_analytics_by_country from public;
grant execute on function public.get_link_analytics_by_country to authenticated;

create function public.get_link_analytics_by_device(p_link_id uuid, p_from timestamptz default null, p_to timestamptz default null)
returns table (device text, clicks bigint)
language sql stable set search_path = public as $$
  select coalesce(device, 'Unknown') as device, count(*) as clicks
  from public.analytics
  where link_id = p_link_id
    and (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to)
  group by 1 order by 2 desc;
$$;
revoke all on function public.get_link_analytics_by_device from public;
grant execute on function public.get_link_analytics_by_device to authenticated;

create function public.get_link_analytics_by_referrer(p_link_id uuid, p_from timestamptz default null, p_to timestamptz default null)
returns table (referrer text, clicks bigint)
language sql stable set search_path = public as $$
  select coalesce(referrer, 'Directo') as referrer, count(*) as clicks
  from public.analytics
  where link_id = p_link_id
    and (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to)
  group by 1 order by 2 desc;
$$;
revoke all on function public.get_link_analytics_by_referrer from public;
grant execute on function public.get_link_analytics_by_referrer to authenticated;

create function public.get_link_analytics_by_channel(p_link_id uuid, p_from timestamptz default null, p_to timestamptz default null)
returns table (channel text, clicks bigint)
language sql stable set search_path = public as $$
  select channel, count(*) as clicks
  from public.analytics
  where link_id = p_link_id
    and (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to)
  group by 1 order by 2 desc;
$$;
revoke all on function public.get_link_analytics_by_channel from public;
grant execute on function public.get_link_analytics_by_channel to authenticated;

-- visitor_hash = sha256(link_id|cf-connecting-ip|day) — contar hashes
-- distintos aproxima visitantes únicos diarios sin cookies ni columna de IP.
create function public.get_link_analytics_unique_visitors(p_link_id uuid, p_from timestamptz default null, p_to timestamptz default null)
returns bigint
language sql stable set search_path = public as $$
  select count(distinct visitor_hash) from public.analytics
  where link_id = p_link_id
    and visitor_hash is not null
    and (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to);
$$;
revoke all on function public.get_link_analytics_unique_visitors from public;
grant execute on function public.get_link_analytics_unique_visitors to authenticated;

-- Equivalentes de toda la empresa para el dashboard de superadmin, sin
-- filtro de link_id — se apoyan enteramente en RLS
-- (analytics_select_own_or_superadmin) para scopear filas: un usuario
-- regular solo ve las analíticas de sus propios links, un superadmin ve las
-- de toda la empresa.
create function public.get_analytics_summary_daily(p_from timestamptz default null, p_to timestamptz default null)
returns table (day date, clicks bigint)
language sql stable set search_path = public as $$
  select date_trunc('day', scanned_at)::date as day, count(*) as clicks
  from public.analytics
  where (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to)
  group by 1 order by 1;
$$;
revoke all on function public.get_analytics_summary_daily from public;
grant execute on function public.get_analytics_summary_daily to authenticated;

create function public.get_analytics_summary_by_country(p_from timestamptz default null, p_to timestamptz default null)
returns table (country text, clicks bigint)
language sql stable set search_path = public as $$
  select coalesce(country, 'Unknown') as country, count(*) as clicks
  from public.analytics
  where (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to)
  group by 1 order by 2 desc;
$$;
revoke all on function public.get_analytics_summary_by_country from public;
grant execute on function public.get_analytics_summary_by_country to authenticated;

create function public.get_analytics_summary_by_device(p_from timestamptz default null, p_to timestamptz default null)
returns table (device text, clicks bigint)
language sql stable set search_path = public as $$
  select coalesce(device, 'Unknown') as device, count(*) as clicks
  from public.analytics
  where (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to)
  group by 1 order by 2 desc;
$$;
revoke all on function public.get_analytics_summary_by_device from public;
grant execute on function public.get_analytics_summary_by_device to authenticated;

create function public.get_analytics_summary_by_referrer(p_from timestamptz default null, p_to timestamptz default null)
returns table (referrer text, clicks bigint)
language sql stable set search_path = public as $$
  select coalesce(referrer, 'Directo') as referrer, count(*) as clicks
  from public.analytics
  where (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to)
  group by 1 order by 2 desc;
$$;
revoke all on function public.get_analytics_summary_by_referrer from public;
grant execute on function public.get_analytics_summary_by_referrer to authenticated;

create function public.get_analytics_summary_by_channel(p_from timestamptz default null, p_to timestamptz default null)
returns table (channel text, clicks bigint)
language sql stable set search_path = public as $$
  select channel, count(*) as clicks
  from public.analytics
  where (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to)
  group by 1 order by 2 desc;
$$;
revoke all on function public.get_analytics_summary_by_channel from public;
grant execute on function public.get_analytics_summary_by_channel to authenticated;

create function public.get_analytics_summary_unique_visitors(p_from timestamptz default null, p_to timestamptz default null)
returns bigint
language sql stable set search_path = public as $$
  select count(distinct visitor_hash) from public.analytics
  where visitor_hash is not null
    and (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to);
$$;
revoke all on function public.get_analytics_summary_unique_visitors from public;
grant execute on function public.get_analytics_summary_unique_visitors to authenticated;

-- Un caller autenticado por sesión (auth.uid() is not null) siempre usa su
-- propio id, ignorando p_user_id — cierra la vía de llamar el RPC directo
-- vía PostgREST con un p_user_id ajeno. Un actor nulo (llamadas
-- service-role, ej. la API pública con Bearer token en
-- src/pages/api/public/links.ts, que no tiene JWT de sesión) cae al
-- p_user_id confiado que la app ya validó en esa capa.
create or replace function public.check_and_increment_link_quota(p_user_id uuid, p_daily_limit int)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_count int;
  v_user_id uuid := coalesce(auth.uid(), p_user_id);
begin
  insert into public.link_creation_quota (user_id, window_start, count)
  values (v_user_id, current_date, 1)
  on conflict (user_id) do update
    set count = case
        when link_creation_quota.window_start = current_date then link_creation_quota.count + 1
        else 1
      end,
      window_start = current_date
  returning count into v_count;

  return v_count <= p_daily_limit;
end;
$$;
revoke all on function public.check_and_increment_link_quota from public;
grant execute on function public.check_and_increment_link_quota to authenticated;

-- Si el /setup inicial todavía hace falta, derivado de profiles en vez de un
-- flag guardado: si el último superadmin se borra/degrada, /setup se reabre
-- solo en vez de dejar la instancia permanentemente inmanejable — auto-
-- sanación intencional, no un bug. Grantable a anon también porque debe ser
-- invocable antes de que exista cualquier sesión.
create or replace function public.onboarding_needed()
returns boolean language sql security definer set search_path = public stable as $$
  select not exists (select 1 from public.profiles where role = 'superadmin');
$$;
revoke execute on function public.onboarding_needed() from public;
grant execute on function public.onboarding_needed() to anon, authenticated;

-- Acción "zona de peligro" solo-superadmin: vacía el *contenido* de negocio
-- preservando explícitamente cuentas de usuario (profiles/auth.users, nunca
-- nombradas abajo) y el singleton branding_settings. La lista de tablas está
-- hardcodeada y revisada acá, no derivada de information_schema — agregar
-- una tabla de negocio nueva más adelante debe ser una edición deliberada y
-- revisable a esta lista, no algo automático.
create or replace function public.wipe_all_data()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then
    raise exception 'only a superadmin can wipe data';
  end if;

  truncate table
    public.analytics,
    public.link_tags,
    public.alert_rules,
    public.notifications,
    public.api_tokens,
    public.link_creation_quota,
    public.links,
    public.tags,
    public.allowed_domains,
    public.blocked_url_patterns,
    public.audit_log,
    public.departments
  restart identity cascade;
end;
$$;
revoke execute on function public.wipe_all_data() from public;
grant execute on function public.wipe_all_data() to authenticated;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.links enable row level security;
alter table public.analytics enable row level security;
alter table public.tags enable row level security;
alter table public.link_tags enable row level security;
alter table public.departments enable row level security;
alter table public.audit_log enable row level security;
-- Sin políticas a propósito: solo accesible vía check_and_increment_link_quota().
alter table public.link_creation_quota enable row level security;
alter table public.allowed_domains enable row level security;
alter table public.blocked_url_patterns enable row level security;
alter table public.alert_rules enable row level security;
alter table public.notifications enable row level security;
alter table public.api_tokens enable row level security;
alter table public.branding_settings enable row level security;

-- profiles
create policy "profiles_select_own_or_superadmin" on public.profiles for select
  using (id = auth.uid() or public.is_superadmin());
create policy "profiles_update_superadmin" on public.profiles for update
  using (public.is_superadmin()) with check (public.is_superadmin());
-- El signup normal pasa por el trigger SECURITY DEFINER, bypaseando RLS.
create policy "profiles_insert_superadmin" on public.profiles for insert
  with check (public.is_superadmin());
-- Los managers tienen visibilidad de lectura sobre la gente y links de su
-- propio departamento ("vista de equipo"), en capas sobre las policies de
-- fila-propia/superadmin — deliberadamente solo SELECT, sin acceso de escritura.
create policy "profiles_select_manager" on public.profiles for select
  using (department_id is not null and public.is_manager_of(department_id));
-- Deja que cualquier usuario actualice su propia fila (full_name/avatar_url)
-- — guard_profile_self_update() arriba es el backstop a nivel de columna.
create policy "profiles_update_self" on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- links
create policy "links_select_own_or_superadmin" on public.links for select
  using (user_id = auth.uid() or public.is_superadmin());
create policy "links_insert_own_or_superadmin" on public.links for insert
  with check (user_id = auth.uid() or public.is_superadmin());
create policy "links_update_own_or_superadmin" on public.links for update
  using (user_id = auth.uid() or public.is_superadmin())
  with check (user_id = auth.uid() or public.is_superadmin());
create policy "links_delete_own_or_superadmin" on public.links for delete
  using (user_id = auth.uid() or public.is_superadmin());
create policy "links_select_manager" on public.links for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = links.user_id
        and profiles.department_id is not null
        and public.is_manager_of(profiles.department_id)
    )
  );

-- analytics: solo lectura vía RLS; los inserts pasan exclusivamente por el
-- RPC SECURITY DEFINER record_scan().
create policy "analytics_select_own_or_superadmin" on public.analytics for select
  using (
    public.is_superadmin()
    or exists (select 1 from public.links where links.id = analytics.link_id and links.user_id = auth.uid())
  );

-- tags / link_tags
create policy "tags_all_own_or_superadmin" on public.tags for all
  using (user_id = auth.uid() or public.is_superadmin())
  with check (user_id = auth.uid() or public.is_superadmin());
create policy "link_tags_all_own_or_superadmin" on public.link_tags for all
  using (
    public.is_superadmin()
    or exists (select 1 from public.links where links.id = link_tags.link_id and links.user_id = auth.uid())
  )
  with check (
    public.is_superadmin()
    or exists (select 1 from public.links where links.id = link_tags.link_id and links.user_id = auth.uid())
  );

-- departments: cualquier usuario autenticado necesita leer la lista (select
-- de "departamento" en algún lado); solo un superadmin crea/edita/borra.
create policy "departments_select_authenticated" on public.departments for select
  to authenticated using (true);
create policy "departments_insert_superadmin" on public.departments for insert
  with check (public.is_superadmin());
create policy "departments_update_superadmin" on public.departments for update
  using (public.is_superadmin()) with check (public.is_superadmin());
create policy "departments_delete_superadmin" on public.departments for delete
  using (public.is_superadmin());

-- audit_log: sin policy de insert/update/delete para ningún rol — cada fila
-- la escriben exclusivamente las funciones trigger SECURITY DEFINER de
-- arriba, que bypasean RLS. El registro de auditoría no se puede editar ni
-- agregar vía API, solo observar (superadmin).
create policy "audit_log_select_superadmin" on public.audit_log for select
  using (public.is_superadmin());

-- allowed_domains / blocked_url_patterns: cualquier autenticado necesita
-- lectura (create.ts/[id].ts validan destination_url contra ambas listas con
-- el client de sesión del caller).
create policy "allowed_domains_select_authenticated" on public.allowed_domains for select
  to authenticated using (true);
create policy "allowed_domains_insert_superadmin" on public.allowed_domains for insert
  with check (public.is_superadmin());
create policy "allowed_domains_delete_superadmin" on public.allowed_domains for delete
  using (public.is_superadmin());

create policy "blocked_url_patterns_select_authenticated" on public.blocked_url_patterns for select
  to authenticated using (true);
create policy "blocked_url_patterns_insert_superadmin" on public.blocked_url_patterns for insert
  with check (public.is_superadmin());
create policy "blocked_url_patterns_delete_superadmin" on public.blocked_url_patterns for delete
  using (public.is_superadmin());

-- alert_rules
create policy "alert_rules_select_own_or_superadmin" on public.alert_rules for select
  using (created_by = auth.uid() or public.is_superadmin());
create policy "alert_rules_insert_own_or_superadmin" on public.alert_rules for insert
  with check (
    created_by = auth.uid()
    and (link_id is not null or public.is_superadmin())
    and (
      link_id is null
      or exists (select 1 from public.links where links.id = link_id and (links.user_id = auth.uid() or public.is_superadmin()))
    )
  );
create policy "alert_rules_delete_own_or_superadmin" on public.alert_rules for delete
  using (created_by = auth.uid() or public.is_superadmin());

-- notifications: sin policy de insert para ningún rol — las filas las
-- escriben exclusivamente el trigger SECURITY DEFINER de arriba y el cron
-- handler con client service-role (bypasea RLS).
create policy "notifications_select_own" on public.notifications for select
  using (user_id = auth.uid());
-- Solo read_at cambia desde el cliente (marcar como leída) — sin RLS a nivel
-- de columna, pero la ruta PATCH de la app solo setea ese campo.
create policy "notifications_update_own" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- api_tokens
create policy "api_tokens_select_own" on public.api_tokens for select
  using (user_id = auth.uid());
create policy "api_tokens_insert_own" on public.api_tokens for insert
  with check (user_id = auth.uid());
-- Solo revocar (setear revoked_at) pasa desde el cliente — name y
-- token_hash son inmutables una vez creados.
create policy "api_tokens_revoke_own" on public.api_tokens for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- branding_settings: no es data sensible — necesaria pre-auth en /login, el
-- interstitial de [code].astro, y el favicon/título público en toda página.
create policy "branding_settings_select_public" on public.branding_settings for select
  using (true);
create policy "branding_settings_update_superadmin" on public.branding_settings for update
  using (public.is_superadmin()) with check (public.is_superadmin());

-- ============================================================================
-- STORAGE (bucket de branding para logo/favicon subidos)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('branding', 'branding', true);

-- El bucket es público, así que las lecturas ya funcionan sin ninguna policy
-- vía el endpoint de URL pública — esta select policy es defense-in-depth,
-- no estrictamente necesaria.
create policy "branding_bucket_select_public" on storage.objects for select
  using (bucket_id = 'branding');

-- El upload del propio onboarding (antes de que exista cualquier
-- superadmin/sesión) pasa por el client admin service-role, que bypasea RLS
-- de storage entera — mismo patrón de actor-nulo que las escrituras de
-- profiles durante /setup. Estas policies solo gatean el tab Branding
-- superadmin *en curso*, que usa el client de sesión con RLS.
create policy "branding_bucket_insert_superadmin" on storage.objects for insert
  to authenticated with check (bucket_id = 'branding' and public.is_superadmin());
create policy "branding_bucket_update_superadmin" on storage.objects for update
  to authenticated using (bucket_id = 'branding' and public.is_superadmin())
  with check (bucket_id = 'branding' and public.is_superadmin());
create policy "branding_bucket_delete_superadmin" on storage.objects for delete
  to authenticated using (bucket_id = 'branding' and public.is_superadmin());
