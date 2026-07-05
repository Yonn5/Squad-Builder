-- Squad Builder — initial schema
-- Apply via the Supabase SQL editor, or `supabase db push` with the CLI.

-- ============================================================
-- PROFILES (one per auth user; self-assigned stats + playstyles)
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null unique check (char_length(username) between 2 and 24),
  position    text not null default 'ST' check (position in
    ('GK','RB','CB','LB','CDM','CM','CAM','RM','LM','RW','LW','ST')),
  pac         int not null default 70 check (pac between 1 and 99),
  sho         int not null default 70 check (sho between 1 and 99),
  pas         int not null default 70 check (pas between 1 and 99),
  dri         int not null default 70 check (dri between 1 and 99),
  def         int not null default 70 check (def between 1 and 99),
  phy         int not null default 70 check (phy between 1 and 99),
  playstyles  text[] not null default '{}' check (cardinality(playstyles) <= 4),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create a profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'username',
      'player_' || substr(new.id::text, 1, 8)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- TEAMS & MEMBERSHIP (creator becomes captain; join via code)
-- ============================================================
create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 32),
  captain_id  uuid not null references public.profiles (id) on delete cascade,
  join_code   text not null unique default upper(substr(md5(random()::text), 1, 6)),
  created_at  timestamptz not null default now()
);

create table public.team_members (
  team_id    uuid not null references public.teams (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- Captain is automatically a member.
create or replace function public.handle_new_team()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.team_members (team_id, user_id)
  values (new.id, new.captain_id);
  return new;
end;
$$;

create trigger on_team_created
  after insert on public.teams
  for each row execute function public.handle_new_team();

-- ============================================================
-- LINEUPS (captain sets formation; members claim slots)
-- ============================================================
create table public.lineups (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams (id) on delete cascade,
  name        text not null default 'Matchday',
  formation   text not null,       -- formation key, e.g. '6v6-2-2-1' (validated in app)
  size        int  not null check (size in (6, 10)),
  created_at  timestamptz not null default now()
);

create table public.lineup_slots (
  id          uuid primary key default gen_random_uuid(),
  lineup_id   uuid not null references public.lineups (id) on delete cascade,
  slot_index  int  not null,
  position    text not null check (position in
    ('GK','RB','CB','LB','CDM','CM','CAM','RM','LM','RW','LW','ST')),
  player_id   uuid references public.profiles (id) on delete set null,
  unique (lineup_id, slot_index),
  unique (lineup_id, player_id)   -- a player can claim at most one slot per lineup
);

-- ============================================================
-- FIXTURES (captain-to-captain scheduling) & MATCH STATS
-- ============================================================
create table public.matches (
  id            uuid primary key default gen_random_uuid(),
  home_team_id  uuid not null references public.teams (id) on delete cascade,
  away_team_id  uuid not null references public.teams (id) on delete cascade,
  created_by    uuid not null references public.profiles (id) on delete cascade,
  kickoff_at    timestamptz not null,
  location      text,
  status        text not null default 'proposed'
                check (status in ('proposed','accepted','declined','completed')),
  home_score    int check (home_score >= 0),
  away_score    int check (away_score >= 0),
  created_at    timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

create table public.match_player_stats (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches (id) on delete cascade,
  team_id    uuid not null references public.teams (id) on delete cascade,
  player_id  uuid not null references public.profiles (id) on delete cascade,
  goals      int not null default 0 check (goals >= 0),
  assists    int not null default 0 check (assists >= 0),
  motm       boolean not null default false,
  unique (match_id, player_id)
);

-- ============================================================
-- HELPERS for RLS
-- ============================================================
create or replace function public.is_team_member(t uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = t and user_id = auth.uid()
  );
$$;

create or replace function public.is_team_captain(t uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.teams
    where id = t and captain_id = auth.uid()
  );
$$;

create or replace function public.is_match_captain(m uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.matches ma
    join public.teams t on t.id in (ma.home_team_id, ma.away_team_id)
    where ma.id = m and t.captain_id = auth.uid()
  );
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- This is a private app for a friend group, so all authenticated
-- users can READ everything; writes are restricted by role.
-- ============================================================
alter table public.profiles           enable row level security;
alter table public.teams              enable row level security;
alter table public.team_members       enable row level security;
alter table public.lineups            enable row level security;
alter table public.lineup_slots       enable row level security;
alter table public.matches            enable row level security;
alter table public.match_player_stats enable row level security;

-- profiles
create policy "profiles are readable" on public.profiles
  for select to authenticated using (true);
create policy "users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- teams
create policy "teams are readable" on public.teams
  for select to authenticated using (true);
create policy "anyone can create a team they captain" on public.teams
  for insert to authenticated with check (captain_id = auth.uid());
create policy "captain updates team" on public.teams
  for update to authenticated using (captain_id = auth.uid()) with check (captain_id = auth.uid());
create policy "captain deletes team" on public.teams
  for delete to authenticated using (captain_id = auth.uid());

-- team_members
create policy "memberships are readable" on public.team_members
  for select to authenticated using (true);
create policy "join a team yourself" on public.team_members
  for insert to authenticated with check (user_id = auth.uid());
create policy "leave team or be removed by captain" on public.team_members
  for delete to authenticated using (user_id = auth.uid() or public.is_team_captain(team_id));

-- lineups
create policy "lineups are readable" on public.lineups
  for select to authenticated using (true);
create policy "captain creates lineups" on public.lineups
  for insert to authenticated with check (public.is_team_captain(team_id));
create policy "captain updates lineups" on public.lineups
  for update to authenticated using (public.is_team_captain(team_id));
create policy "captain deletes lineups" on public.lineups
  for delete to authenticated using (public.is_team_captain(team_id));

-- lineup_slots (members may update slots so they can claim/leave open positions)
create policy "slots are readable" on public.lineup_slots
  for select to authenticated using (true);
create policy "captain creates slots" on public.lineup_slots
  for insert to authenticated with check (
    public.is_team_captain((select team_id from public.lineups where id = lineup_id))
  );
create policy "team members update slots" on public.lineup_slots
  for update to authenticated using (
    public.is_team_member((select team_id from public.lineups where id = lineup_id))
  );
create policy "captain deletes slots" on public.lineup_slots
  for delete to authenticated using (
    public.is_team_captain((select team_id from public.lineups where id = lineup_id))
  );

-- matches
create policy "matches are readable" on public.matches
  for select to authenticated using (true);
create policy "home captain proposes match" on public.matches
  for insert to authenticated with check (
    created_by = auth.uid() and public.is_team_captain(home_team_id)
  );
create policy "either captain updates match" on public.matches
  for update to authenticated using (public.is_match_captain(id));
create policy "either captain deletes match" on public.matches
  for delete to authenticated using (public.is_match_captain(id));

-- match_player_stats
create policy "match stats are readable" on public.match_player_stats
  for select to authenticated using (true);
create policy "captains record stats" on public.match_player_stats
  for insert to authenticated with check (public.is_match_captain(match_id));
create policy "captains update stats" on public.match_player_stats
  for update to authenticated using (public.is_match_captain(match_id));
create policy "captains delete stats" on public.match_player_stats
  for delete to authenticated using (public.is_match_captain(match_id));

-- ============================================================
-- updated_at maintenance
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
