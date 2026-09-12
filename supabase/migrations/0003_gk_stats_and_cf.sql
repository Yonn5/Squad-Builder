-- Centre Forward, plus goalkeeper-specific stats.
-- Safe to re-run.

-- ============================================================
-- Add CF to the allowed positions
-- ============================================================
alter table public.profiles drop constraint if exists profiles_position_check;
alter table public.profiles add constraint profiles_position_check
  check (position in
    ('GK','RB','CB','LB','CDM','CM','CAM','RM','LM','RW','LW','CF','ST'));

alter table public.lineup_slots drop constraint if exists lineup_slots_position_check;
alter table public.lineup_slots add constraint lineup_slots_position_check
  check (position in
    ('GK','RB','CB','LB','CDM','CM','CAM','RM','LM','RW','LW','CF','ST'));

-- ============================================================
-- Goalkeeper stats (diving / handling / kicking / reflexes /
-- speed / positioning). Separate columns so a player switching
-- between GK and outfield keeps both sets intact.
-- ============================================================
alter table public.profiles
  add column if not exists gk_div int not null default 70 check (gk_div between 1 and 99),
  add column if not exists gk_han int not null default 70 check (gk_han between 1 and 99),
  add column if not exists gk_kic int not null default 70 check (gk_kic between 1 and 99),
  add column if not exists gk_ref int not null default 70 check (gk_ref between 1 and 99),
  add column if not exists gk_spd int not null default 70 check (gk_spd between 1 and 99),
  add column if not exists gk_pos int not null default 70 check (gk_pos between 1 and 99);

-- Pin the search_path (flagged by the Supabase linter).
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
