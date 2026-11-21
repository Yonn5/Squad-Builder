-- 7v7 and 8v8 alongside 6, 9, 10 and 11 a side. Safe to re-run.
alter table public.lineups drop constraint if exists lineups_size_check;
alter table public.lineups add constraint lineups_size_check
  check (size in (6, 7, 8, 9, 10, 11));

alter table public.matches drop constraint if exists matches_size_check;
alter table public.matches add constraint matches_size_check
  check (size in (6, 7, 8, 9, 10, 11));
