-- Run in the Supabase SQL Editor.
-- Adds: identifiers + details from the SM360 inventory feed (carsonexports.com),
-- so the sync can match vehicles exactly instead of by year/make/model.

-- 1) New columns (all optional — admin-created vehicles leave them empty)
alter table public.vehicles add column if not exists source     text;          -- 'sm360' when imported from the feed
alter table public.vehicles add column if not exists source_id  text;          -- SM360 vehicleId
alter table public.vehicles add column if not exists vin        text;
alter table public.vehicles add column if not exists stock_no   text;
alter table public.vehicles add column if not exists trim       text not null default '';
alter table public.vehicles add column if not exists carfax_url text;
alter table public.vehicles add column if not exists on_hold    boolean not null default false;

-- 2) One row per feed vehicle; fast VIN lookups
create unique index if not exists vehicles_source_unique on public.vehicles (source, source_id) where source_id is not null;
create index if not exists vehicles_vin_idx on public.vehicles (vin);

-- 3) Grace period before marking sold: set when a car first goes missing from
--    the feed, cleared when it reappears. Marked sold only if still missing at
--    a sync 12+ hours later (one incomplete feed must not hide cars).
alter table public.vehicles add column if not exists missing_since timestamptz;
