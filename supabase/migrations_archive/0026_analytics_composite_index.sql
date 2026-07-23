-- Fase 11: every per-link analytics function (get_link_analytics_daily,
-- _by_country, _by_device, _by_referrer, _by_channel, _unique_visitors —
-- migrations 0011 and 0023) filters with `link_id = ... and scanned_at
-- between ...`. With two separate single-column indexes, Postgres has to
-- pick one and re-filter (or BitmapAnd both) instead of resolving the whole
-- condition with a single index seek.
create index if not exists analytics_link_id_scanned_at_idx on public.analytics (link_id, scanned_at);

-- Redundant now: any query that filters by link_id alone is served just as
-- well by the composite index above (link_id is its leftmost column).
-- analytics_scanned_at_idx is kept — the company-wide summary functions
-- (migration 0021) filter by scanned_at alone, with no link_id.
drop index if exists public.analytics_link_id_idx;
