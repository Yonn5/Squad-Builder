-- Fixes found by testing the rules as several users at once. Safe to re-run.
--
-- The rules below only constrain requests made by app users (the
-- `authenticated` role). The database's own triggers and maintenance run as
-- other roles and pass straight through, so cascades and the attendance
-- automation are unaffected.

-- ============================================================
-- 1. A player who leaves or is removed from a team gives up their slots.
--    Before this their name stayed on the slot: the app showed it as open
--    (it only draws current members) but nobody could claim it.
-- ============================================================
create or replace function public.on_membership_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.lineup_slots s
  set player_id = null
  from public.lineups l
  where l.id = s.lineup_id
    and l.team_id = old.team_id
    and s.player_id = old.user_id;
  return old;
end;
$$;

drop trigger if exists membership_removed on public.team_members;
create trigger membership_removed
  after delete on public.team_members
  for each row execute function public.on_membership_removed();

revoke all on function public.on_membership_removed() from public, anon, authenticated;

-- Free any slots already stuck this way.
update public.lineup_slots s
set player_id = null
from public.lineups l
where l.id = s.lineup_id
  and s.player_id is not null
  and not exists (
    select 1 from public.team_members tm
    where tm.team_id = l.team_id and tm.user_id = s.player_id
  );

-- ============================================================
-- 2. Live lineups. The pitch subscribes to changes on lineup_slots, but a
--    table only streams changes once it is in this publication.
-- ============================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public' and tablename = 'lineup_slots'
     ) then
    alter publication supabase_realtime add table public.lineup_slots;
  end if;
end;
$$;

-- ============================================================
-- 3. Slots: claim an open one for yourself, leave your own, and only the
--    captain clears someone else's. The update policy alone let any member
--    overwrite a team-mate's slot, put anyone in one, or change positions.
-- ============================================================
create or replace function public.guard_slot_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_team uuid;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.lineup_id is distinct from old.lineup_id
     or new.slot_index is distinct from old.slot_index
     or new.position is distinct from old.position then
    raise exception 'A lineup''s positions are set when it is created'
      using errcode = '42501';
  end if;

  if new.player_id is not distinct from old.player_id then
    return new;
  end if;

  select team_id into v_team from public.lineups where id = new.lineup_id;

  if new.player_id = auth.uid() and old.player_id is null then
    return new;  -- claiming an open slot
  end if;
  if new.player_id is null
     and (old.player_id = auth.uid() or public.is_team_captain(v_team)) then
    return new;  -- leaving your own slot, or the captain clearing one
  end if;

  raise exception 'You can claim an open slot for yourself or leave your own'
    using errcode = '42501';
end;
$$;

drop trigger if exists guard_slot_change on public.lineup_slots;
create trigger guard_slot_change
  before update on public.lineup_slots
  for each row execute function public.guard_slot_change();

-- ============================================================
-- 4. Fixtures follow their stages. Previously either captain could set any
--    status (skipping attendance entirely), accept their own proposal, or
--    point the fixture at an unrelated team.
--
--      proposed   -> recruiting / dropped   receiving captain decides
--      proposed   -> dropped                proposing captain withdraws
--      recruiting / accepted -> completed   either captain records a result
--      recruiting <-> accepted              automatic only, from attendance
-- ============================================================
create or replace function public.guard_match_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_home boolean;
  v_away boolean;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.home_team_id is distinct from old.home_team_id
     or new.away_team_id is distinct from old.away_team_id
     or new.created_by is distinct from old.created_by then
    raise exception 'A fixture''s teams cannot be changed' using errcode = '42501';
  end if;

  v_home := public.is_team_captain(old.home_team_id);
  v_away := public.is_team_captain(old.away_team_id);

  if new.status is distinct from old.status then
    if old.status = 'proposed' and new.status in ('recruiting', 'dropped') and v_away then
      null;
    elsif old.status = 'proposed' and new.status = 'dropped' and v_home then
      null;
    elsif old.status in ('recruiting', 'accepted') and new.status = 'completed' then
      null;
    else
      raise exception 'A fixture cannot go from % to %', old.status, new.status
        using errcode = '42501';
    end if;
  end if;

  if (new.home_score is distinct from old.home_score
      or new.away_score is distinct from old.away_score)
     and new.status <> 'completed' then
    raise exception 'A score can only be recorded for a completed fixture'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_match_change on public.matches;
create trigger guard_match_change
  before update on public.matches
  for each row execute function public.guard_match_change();

-- Accepting a fixture every player has already confirmed settles it at once,
-- instead of leaving it on recruiting until someone changes their answer.
create or replace function public.on_match_accepted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'proposed' and new.status = 'recruiting' then
    perform public.refresh_match_confirmation(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists match_accepted on public.matches;
create trigger match_accepted
  after update of status on public.matches
  for each row execute function public.on_match_accepted();

revoke all on function public.on_match_accepted() from public, anon, authenticated;

-- ============================================================
-- 5. Attendance and stats only for players in the fixture.
-- ============================================================
drop policy if exists "answer for yourself" on public.match_attendance;
create policy "answer for yourself" on public.match_attendance
  for insert to authenticated with check (
    player_id = auth.uid()
    and exists (
      select 1
      from public.matches m
      join public.team_members tm
        on tm.team_id in (m.home_team_id, m.away_team_id)
      where m.id = match_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "captains record stats" on public.match_player_stats;
create policy "captains record stats" on public.match_player_stats
  for insert to authenticated with check (
    public.is_match_captain(match_id)
    and exists (
      select 1 from public.matches m
      where m.id = match_id and team_id in (m.home_team_id, m.away_team_id)
    )
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = match_player_stats.team_id
        and tm.user_id = match_player_stats.player_id
    )
  );

-- ============================================================
-- 6. Invite codes are private to the captain. Every signed-in user could
--    read every team's code, and with it join any team.
-- ============================================================
revoke select on public.teams from anon, authenticated;
grant select (id, name, captain_id, created_at) on public.teams to authenticated;

create or replace function public.team_invite_code(p_team_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select join_code from public.teams
  where id = p_team_id and captain_id = auth.uid();
$$;

-- Finding an opponent: the other captain shares their code with you.
create or replace function public.find_team_by_code(p_code text)
returns table (id uuid, name text, captain_id uuid, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.name, t.captain_id, t.created_at
  from public.teams t
  where t.join_code = upper(trim(p_code));
$$;

revoke all on function public.team_invite_code(uuid) from public, anon;
revoke all on function public.find_team_by_code(text) from public, anon;
grant execute on function public.team_invite_code(uuid) to authenticated;
grant execute on function public.find_team_by_code(text) to authenticated;

-- ============================================================
-- 7. Sign-up can check a name is free before creating the account. A taken
--    name used to fail inside the sign-up itself, which the app could only
--    report as the server being down.
-- ============================================================
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(trim(p_username))
  );
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;
