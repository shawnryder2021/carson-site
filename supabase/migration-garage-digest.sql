-- ============================================================
--  Weekly "new arrivals for you" garage digest — profile columns.
--  Run in the Supabase SQL editor. Idempotent.
--    digest_opt_out       — shopper's unsubscribe state (email link / in-app)
--    digest_last_sent_at  — dedupe anchor; the next digest only considers
--                           inventory added after this timestamp
-- ============================================================

alter table public.profiles add column if not exists digest_opt_out boolean not null default false;
alter table public.profiles add column if not exists digest_last_sent_at timestamptz;

notify pgrst, 'reload schema';
