-- 9v9 and 11v11 alongside 6v6 and 10v10. Safe to re-run.
alter table public.lineups drop constraint if exists lineups_size_check;
alter table public.lineups add constraint lineups_size_check
  check (size in (6, 9, 10, 11));

alter table public.matches drop constraint if exists matches_size_check;
alter table public.matches add constraint matches_size_check
  check (size in (6, 9, 10, 11));
