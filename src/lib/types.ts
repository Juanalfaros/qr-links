export interface TagRow {
  id: string;
  name: string;
}

export interface LinkRow {
  id: string;
  title: string;
  short_code: string;
  destination_url: string;
  created_at: string;
  deleted_at: string | null;
  is_pinned: boolean;
  clicks: number;
  tags: TagRow[];
  expires_at: string | null;
  max_clicks: number | null;
  click_count: number;
  has_password: boolean;
  show_interstitial: boolean;
  webhook_url: string | null;
  ga_tracking_id: string | null;
}

export type UserRole = 'user' | 'manager' | 'superadmin';

export interface DepartmentRow {
  id: string;
  name: string;
}

export interface AllowedDomainRow {
  id: string;
  domain: string;
}

export interface BlockedPatternRow {
  id: string;
  pattern: string;
}

export interface ApiTokenRow {
  id: string;
  name: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  title: string;
  body: string;
  link_url: string | null;
  read_at: string | null;
  created_at: string;
}

export interface AlertRuleRow {
  id: string;
  link_id: string | null;
  threshold_count: number;
  window_hours: number;
  notify_email: string;
  last_triggered_at: string | null;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  full_name: string | null;
  avatar_url: string | null;
  department_id: string | null;
  suspended_at: string | null;
}

export interface AuditLogRow {
  id: string;
  actor_email: string | null;
  action: string;
  target_table: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Raw shape of an `audit_log` select with the embedded `profiles(email)` actor relation. */
export interface AuditLogQueryRow {
  id: string;
  action: string;
  target_table: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  profiles: { email: string }[] | null;
}

export interface GlobalLinkRow extends Omit<LinkRow, 'tags'> {
  owner_email: string;
}

/**
 * Shape of a raw row returned by a `links` select with an embedded
 * `analytics(count)` aggregate. Includes `password_hash` only so the mapping
 * layer can derive `has_password` — it must never be forwarded to `LinkRow`.
 */
export interface LinkQueryRow {
  id: string;
  title: string;
  short_code: string;
  destination_url: string;
  created_at: string;
  deleted_at: string | null;
  is_pinned: boolean;
  expires_at: string | null;
  max_clicks: number | null;
  click_count: number;
  password_hash: string | null;
  show_interstitial: boolean;
  webhook_url: string | null;
  ga_tracking_id: string | null;
  analytics: { count: number }[] | null;
  link_tags: { tags: TagRow[] }[] | null;
}

/** Same as `LinkQueryRow`, plus the embedded `profiles(email)` relation used for the superadmin global view. */
export interface GlobalLinkQueryRow extends Omit<LinkQueryRow, 'link_tags'> {
  profiles: { email: string }[] | null;
}
