-- Joining a team must require the invite code.
-- Safe to re-run.

-- Previously any signed-in user could insert themselves into ANY team:
-- the policy only checked that the row was about them, never that they
-- knew the code. Route joining through a function that verifies it.
drop policy if exists "join a team yourself" on public.team_members;

create or replace function public.join_team(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_id uuid;
begin
  select id into v_team_id
  from public.teams
  where join_code = upper(trim(p_code));

  if v_team_id is null then
    raise exception 'No team found with that invite code';
  end if;

  insert into public.team_members (team_id, user_id)
  values (v_team_id, auth.uid())
  on conflict (team_id, user_id) do nothing;

  return v_team_id;
end;
$$;

-- Only signed-in users may call it; it always acts on auth.uid().
revoke all on function public.join_team(text) from public, anon;
grant execute on function public.join_team(text) to authenticated;

-- Trigger functions are never callable directly (Postgres rejects a
-- direct call to a trigger function), so drop the public grants the
-- linter flags.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_new_team() from public, anon, authenticated;

-- RLS helpers are called from inside policies as the querying user, so
-- authenticated must keep EXECUTE; anonymous callers never need them.
revoke all on function public.is_team_member(uuid) from public, anon;
revoke all on function public.is_team_captain(uuid) from public, anon;
revoke all on function public.is_match_captain(uuid) from public, anon;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_captain(uuid) to authenticated;
grant execute on function public.is_match_captain(uuid) to authenticated;
