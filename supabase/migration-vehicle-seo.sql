-- Run in the Supabase SQL Editor.
-- Adds: transmission (from the SM360 feed, for vehicle structured data) and
-- carson_take — a short original description per vehicle, written from the
-- car's own data, so vehicle pages aren't only the SM360 copy that is also
-- syndicated to AutoTrader / CarGurus.

alter table public.vehicles add column if not exists transmission text;
alter table public.vehicles add column if not exists carson_take  text;
