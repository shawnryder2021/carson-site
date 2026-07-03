-- ============================================================
--  Security hardening — run in the Supabase SQL Editor.
--  Pins search_path on the two security-definer functions that
--  lacked it (record_price_change, increment_vehicle_view), matching
--  is_admin()/handle_new_user(). Safe to run anytime; recreates the
--  functions in place.
-- ============================================================

create or replace function public.record_price_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.price_history (vehicle_id, price) values (new.id, new.price);
  elsif (tg_op = 'UPDATE' and new.price is distinct from old.price) then
    insert into public.price_history (vehicle_id, price) values (new.id, new.price);
  end if;
  return new;
end;
$$;

create or replace function public.increment_vehicle_view(vid text) returns void
language sql security definer set search_path = public as $$
  update public.vehicles set views = views + 1 where id = vid;
$$;
grant execute on function public.increment_vehicle_view(text) to anon, authenticated;

notify pgrst, 'reload schema';
