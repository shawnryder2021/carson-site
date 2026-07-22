-- ============================================================
--  Test-drive scheduling — bookings table. Run in the Supabase SQL editor.
--  Bookings are created/updated only by the server routes (service role);
--  a customer sees their booking through the linked lead + the own-row read
--  policy below. The partial-unique index enforces one active booking per
--  time slot (cancelled slots free up for rebooking).
-- ============================================================

create table if not exists public.bookings (
  id          uuid primary key default gen_random_uuid(),
  slot_start  timestamptz not null,
  vehicle_id  text references public.vehicles(id) on delete set null,
  lead_id     uuid references public.leads(id) on delete set null,
  user_id     uuid references auth.users(id) on delete set null,
  name        text,
  email       text,
  phone       text,
  status      text not null default 'booked' check (status in ('booked','cancelled','completed','no_show')),
  reminded_at timestamptz,
  created_at  timestamptz not null default now()
);

-- One ACTIVE booking per instant; cancelled rows don't block the slot.
create unique index if not exists bookings_slot_active
  on public.bookings (slot_start) where status = 'booked';

create index if not exists idx_bookings_user on public.bookings(user_id);

alter table public.bookings enable row level security;

drop policy if exists "bookings own read" on public.bookings;
create policy "bookings own read" on public.bookings for select using (auth.uid() = user_id);

drop policy if exists "bookings admin read" on public.bookings;
create policy "bookings admin read" on public.bookings for select using (public.is_admin());

-- No public insert/update/delete: the /api/book-testdrive and cancel routes
-- write with the service-role key (which bypasses RLS).

notify pgrst, 'reload schema';
