-- A captain can leave their team. Safe to re-run.
--
-- When the captain leaves, a team-mate picked at random becomes captain.
-- If nobody else is left, the team is deleted along with its lineups and
-- fixtures.

create or replace function public.leave_team(p_team_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_captain uuid;
  v_successor uuid;
begin
  if not exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = v_me
  ) then
    raise exception 'You are not in this team';
  end if;

  select captain_id into v_captain from public.teams where id = p_team_id;

  if v_captain is distinct from v_me then
    delete from public.team_members where team_id = p_team_id and user_id = v_me;
    return 'left';
  end if;

  select user_id into v_successor
  from public.team_members
  where team_id = p_team_id and user_id <> v_me
  order by random()
  limit 1;

  if v_successor is null then
    delete from public.teams where id = p_team_id;
    return 'deleted';
  end if;

  update public.teams set captain_id = v_successor where id = p_team_id;
  delete from public.team_members where team_id = p_team_id and user_id = v_me;
  return 'handed_over';
end;
$$;

revoke all on function public.leave_team(uuid) from public, anon;
grant execute on function public.leave_team(uuid) to authenticated;

-- Leaving goes through leave_team, so a captain can no longer delete their
-- own membership directly and leave a team with a captain outside its squad.
-- The captain can still remove (kick) anyone else.
drop policy if exists "leave team or be removed by captain" on public.team_members;
create policy "leave team or be removed by captain" on public.team_members
  for delete to authenticated using (
    (user_id = auth.uid() and not public.is_team_captain(team_id))
    or (user_id <> auth.uid() and public.is_team_captain(team_id))
  );
