-- Every player on both teams confirms attendance before a fixture counts
-- as settled. Safe to re-run.

-- ============================================================
-- Status stages
--   proposed   – a captain has offered the fixture
--   dropped    – the receiving captain declined it
--   recruiting – accepted by both captains, players still confirming
--   accepted   – every player on both teams has confirmed
--   completed  – played, with a result recorded
-- ============================================================
update public.matches set status = 'dropped' where status = 'declined';

alter table public.matches drop constraint if exists matches_status_check;
alter table public.matches add constraint matches_status_check
  check (status in ('proposed', 'recruiting', 'accepted', 'dropped', 'completed'));

-- ============================================================
-- Attendance
-- ============================================================
create table if not exists public.match_attendance (
  match_id   uuid not null references public.matches (id) on delete cascade,
  player_id  uuid not null references public.profiles (id) on delete cascade,
  confirmed  boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (match_id, player_id)
);

alter table public.match_attendance enable row level security;

drop policy if exists "attendance is readable" on public.match_attendance;
create policy "attendance is readable" on public.match_attendance
  for select to authenticated using (true);

-- A player answers only for themselves.
drop policy if exists "answer for yourself" on public.match_attendance;
create policy "answer for yourself" on public.match_attendance
  for insert to authenticated with check (player_id = auth.uid());

drop policy if exists "change your own answer" on public.match_attendance;
create policy "change your own answer" on public.match_attendance
  for update to authenticated
  using (player_id = auth.uid()) with check (player_id = auth.uid());

drop policy if exists "withdraw your own answer" on public.match_attendance;
create policy "withdraw your own answer" on public.match_attendance
  for delete to authenticated using (player_id = auth.uid());

-- ============================================================
-- Recompute recruiting / accepted whenever the answers change.
--
-- A fixture is accepted only when no member of either team is still
-- outstanding, so adding a player to a team mid-negotiation correctly
-- knocks it back to recruiting.
-- ============================================================
create or replace function public.refresh_match_confirmation(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_outstanding int;
begin
  select status into v_status from public.matches where id = p_match_id;
  if v_status is null or v_status not in ('recruiting', 'accepted') then
    return;
  end if;

  select count(*) into v_outstanding
  from public.matches m
  join public.team_members tm
    on tm.team_id in (m.home_team_id, m.away_team_id)
  left join public.match_attendance a
    on a.match_id = m.id and a.player_id = tm.user_id
  where m.id = p_match_id
    and coalesce(a.confirmed, false) = false;

  update public.matches
  set status = case when v_outstanding = 0 then 'accepted' else 'recruiting' end
  where id = p_match_id
    and status is distinct from
        (case when v_outstanding = 0 then 'accepted' else 'recruiting' end);
end;
$$;

create or replace function public.on_attendance_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_match_confirmation(old.match_id);
    return old;
  end if;
  perform public.refresh_match_confirmation(new.match_id);
  return new;
end;
$$;

drop trigger if exists attendance_changed on public.match_attendance;
create trigger attendance_changed
  after insert or update or delete on public.match_attendance
  for each row execute function public.on_attendance_changed();

-- Squad changes can make a settled fixture unsettled again.
create or replace function public.on_membership_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_id uuid := coalesce(new.team_id, old.team_id);
  v_match_id uuid;
begin
  for v_match_id in
    select id from public.matches
    where status in ('recruiting', 'accepted')
      and (home_team_id = v_team_id or away_team_id = v_team_id)
  loop
    perform public.refresh_match_confirmation(v_match_id);
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists membership_changed on public.team_members;
create trigger membership_changed
  after insert or delete on public.team_members
  for each row execute function public.on_membership_changed();

revoke all on function public.refresh_match_confirmation(uuid) from public, anon, authenticated;
