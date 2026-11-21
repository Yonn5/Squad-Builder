-- PlayStyles+ depend on the card's colour: bronze 1, silver 2, gold 4.
-- Safe to re-run.
--
-- The rating is worked out exactly as the app does (src/logic/overall.ts):
-- a weighted sum in double precision, added up in the same order, then
-- rounded half up. Matching the app to the last bit matters on a tier
-- boundary, where 74.5 must come out as 75 here too.

create or replace function public.card_overall(p public.profiles)
returns int
language sql
immutable
set search_path = ''
as $$
  select floor(
    case
      when p.position = 'GK' then
        0::float8
        + coalesce(p.gk_div, 70) * 0.22::float8
        + coalesce(p.gk_han, 70) * 0.21::float8
        + coalesce(p.gk_kic, 70) * 0.05::float8
        + coalesce(p.gk_ref, 70) * 0.23::float8
        + coalesce(p.gk_spd, 70) * 0.05::float8
        + coalesce(p.gk_pos, 70) * 0.24::float8
      else
        0::float8
        + p.pac * w.pac + p.sho * w.sho + p.pas * w.pas
        + p.dri * w.dri + p.def * w.def + p.phy * w.phy
    end + 0.5
  )::int
  from (values
    ('CB',  0.1::float8,  0.05::float8, 0.1::float8,  0.1::float8,  0.4::float8,  0.25::float8),
    ('RB',  0.2,  0.05, 0.15, 0.15, 0.3,  0.15),
    ('LB',  0.2,  0.05, 0.15, 0.15, 0.3,  0.15),
    ('CDM', 0.1,  0.1,  0.2,  0.15, 0.3,  0.15),
    ('CM',  0.1,  0.15, 0.3,  0.2,  0.15, 0.1),
    ('CAM', 0.1,  0.25, 0.3,  0.25, 0.03, 0.07),
    ('RM',  0.25, 0.15, 0.25, 0.25, 0.05, 0.05),
    ('LM',  0.25, 0.15, 0.25, 0.25, 0.05, 0.05),
    ('RW',  0.25, 0.25, 0.15, 0.3,  0.02, 0.03),
    ('LW',  0.25, 0.25, 0.15, 0.3,  0.02, 0.03),
    ('CF',  0.15, 0.32, 0.15, 0.25, 0.02, 0.11),
    ('ST',  0.2,  0.4,  0.05, 0.2,  0,    0.15),
    ('GK',  0.05, 0.05, 0.15, 0.1,  0.35, 0.3)
  ) as w(position, pac, sho, pas, dri, def, phy)
  where w.position = p.position;
$$;

-- Gold 75+, silver 65-74, bronze below 65 (tierFor in the app).
create or replace function public.playstyle_limit(p_overall int)
returns int
language sql
immutable
set search_path = ''
as $$
  select case when p_overall >= 75 then 4 when p_overall >= 65 then 2 else 1 end;
$$;

-- Cards already over their limit keep the PlayStyles+ picked first.
update public.profiles p
set playstyles = p.playstyles[1:public.playstyle_limit(public.card_overall(p))]
where cardinality(p.playstyles) > public.playstyle_limit(public.card_overall(p));

create or replace function public.guard_playstyle_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_limit int := public.playstyle_limit(public.card_overall(new));
begin
  if cardinality(new.playstyles) > v_limit then
    raise exception 'A % card can have at most % PlayStyle%',
      case v_limit when 4 then 'gold' when 2 then 'silver' else 'bronze' end,
      v_limit,
      case when v_limit = 1 then '+' else 's+' end
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_playstyle_limit on public.profiles;
create trigger guard_playstyle_limit
  before insert or update on public.profiles
  for each row execute function public.guard_playstyle_limit();
