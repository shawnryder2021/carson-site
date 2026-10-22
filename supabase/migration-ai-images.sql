-- Run in the Supabase SQL Editor.
-- Adds: an admin-approved AI illustration per vehicle (Admin → Missing photos),
-- shown — labelled "AI illustration" — only while the car has no real photos.
-- Kept separate from `images` so the SM360 sync never overwrites or mixes it in.

alter table public.vehicles add column if not exists ai_image    text;
alter table public.vehicles add column if not exists ai_image_at timestamptz;
