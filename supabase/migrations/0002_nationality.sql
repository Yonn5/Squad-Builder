-- Nationality shown at the bottom of the player card.
alter table public.profiles
  add column if not exists nationality text not null default '';
