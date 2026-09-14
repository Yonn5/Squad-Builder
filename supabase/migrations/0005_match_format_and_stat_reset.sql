-- Match format on fixtures, and letting a player reset their own
-- goal contributions. Safe to re-run.

-- ============================================================
-- Fixtures record whether they are 6v6 or 10v10.
-- Nullable so fixtures created before this migration stay valid.
-- ============================================================
alter table public.matches
  add column if not exists size int check (size in (6, 10));

-- ============================================================
-- Reset own goals / assists / MOTM.
--
-- Done as a function rather than an UPDATE policy on
-- match_player_stats: a policy broad enough to allow a reset would
-- also let a player inflate their own numbers. This can only ever
-- zero them, and only for the caller. Appearances and W-D-L are
-- derived from the same rows and are deliberately left intact.
-- ============================================================
create or replace function public.reset_my_goal_contributions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.match_player_stats
  set goals = 0, assists = 0, motm = false
  where player_id = auth.uid()
    and (goals <> 0 or assists <> 0 or motm);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.reset_my_goal_contributions() from public, anon;
grant execute on function public.reset_my_goal_contributions() to authenticated;
