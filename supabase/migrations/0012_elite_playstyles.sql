-- Only a 90+ card holds four PlayStyles+; a gold card under 90 holds three.
-- Bronze 1, silver 2, gold 3, 90+ 4. Builds on 0011. Safe to re-run.

create or replace function public.playstyle_limit(p_overall int)
returns int
language sql
immutable
set search_path = ''
as $$
  select case
    when p_overall >= 90 then 4
    when p_overall >= 75 then 3
    when p_overall >= 65 then 2
    else 1
  end;
$$;

create or replace function public.guard_playstyle_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_overall int := public.card_overall(new);
  v_limit int := public.playstyle_limit(v_overall);
begin
  if cardinality(new.playstyles) > v_limit then
    raise exception 'A %-rated card can have at most % PlayStyle%',
      v_overall,
      v_limit,
      case when v_limit = 1 then '+' else 's+' end
      using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Gold cards under 90 that already hold four keep the three picked first.
update public.profiles p
set playstyles = p.playstyles[1:public.playstyle_limit(public.card_overall(p))]
where cardinality(p.playstyles) > public.playstyle_limit(public.card_overall(p));
