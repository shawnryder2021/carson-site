-- Run in the Supabase SQL Editor.
-- Adds: vehicle view counts, persistent hide override, and price history.

-- 1) New columns
alter table public.vehicles add column if not exists views int not null default 0;
alter table public.vehicles add column if not exists hidden_override boolean not null default false;

-- 2) Price history (one row per price change, including the initial price)
create table if not exists public.price_history (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  text not null references public.vehicles(id) on delete cascade,
  price       int not null,
  recorded_at timestamptz not null default now()
);
alter table public.price_history enable row level security;
drop policy if exists "price history public read" on public.price_history;
create policy "price history public read" on public.price_history for select using (true);

-- Trigger: record every price change no matter where it comes from
-- (admin edit, sheet sync button, or the scheduled sync).
create or replace function public.record_price_change() returns trigger
language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.price_history (vehicle_id, price) values (new.id, new.price);
  elsif (tg_op = 'UPDATE' and new.price is distinct from old.price) then
    insert into public.price_history (vehicle_id, price) values (new.id, new.price);
  end if;
  return new;
end;
$$;

drop trigger if exists vehicles_price_history on public.vehicles;
create trigger vehicles_price_history
  after insert or update on public.vehicles
  for each row execute function public.record_price_change();

-- 3) Anonymous-safe view counter (RPC), so VDP visits can increment views
create or replace function public.increment_vehicle_view(vid text) returns void
language sql security definer as $$
  update public.vehicles set views = views + 1 where id = vid;
$$;
grant execute on function public.increment_vehicle_view(text) to anon, authenticated;

-- 4) Backfill initial price history for existing vehicles (idempotent-ish:
--    only inserts for vehicles that have no history yet)
insert into public.price_history (vehicle_id, price, recorded_at)
select v.id, v.price, v.created_at
from public.vehicles v
where not exists (select 1 from public.price_history ph where ph.vehicle_id = v.id);
