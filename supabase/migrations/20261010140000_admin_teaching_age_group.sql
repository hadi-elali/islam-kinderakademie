-- Admins können als Dozenten einer Altersgruppe angezeigt werden, ohne dass
-- ihre bestehenden Berechtigungen auf diese Altersgruppe begrenzt werden.
create or replace function public.set_profile_primary_role(target_profile_id bigint, next_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_account_role('admin') then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  if next_role is null or next_role not in ('parent', 'teacher', 'admin') then
    raise exception 'Invalid account role';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(610101200);
  if not exists (select 1 from public.profiles as p where p.id = target_profile_id) then
    raise exception 'Profile not found';
  end if;
  if next_role = 'teacher' and not exists (
    select 1 from public.staff_profiles as s
    where s.profile_id = target_profile_id and s.age_group_id is not null
  ) then
    raise exception 'Eine Altersgruppe für die Lehrkraft ist erforderlich.';
  end if;
  if next_role <> 'admin' and exists (
    select 1 from public.user_roles as r where r.profile_id = target_profile_id and r.role = 'admin'
  ) and (select count(*) from public.user_roles as r where r.role = 'admin') <= 1 then
    raise exception 'The last admin cannot be demoted';
  end if;

  delete from public.user_roles as r where r.profile_id = target_profile_id;
  insert into public.user_roles(profile_id, role) values(target_profile_id, next_role);
  if next_role = 'admin' then
    insert into public.user_roles(profile_id, role) values(target_profile_id, 'parent') on conflict do nothing;
  end if;
  if next_role = 'parent' then
    update public.staff_profiles as s set age_group_id = null where s.profile_id = target_profile_id;
    update public.groups as g set teacher_profile_id = null where g.teacher_profile_id = target_profile_id;
  end if;
end;
$$;

create or replace function public.set_profile_primary_role(
  target_profile_id bigint, next_role text, teaching_age_group_id bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_account_role('admin') then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(610101200);
  if next_role = 'teacher' and teaching_age_group_id is null then
    raise exception 'Eine Altersgruppe für die Lehrkraft ist erforderlich.';
  end if;
  if next_role in ('teacher', 'admin') then
    insert into public.staff_profiles(profile_id, age_group_id)
    values(target_profile_id, teaching_age_group_id)
    on conflict (profile_id) do update set age_group_id = excluded.age_group_id;
  end if;
  perform public.set_profile_primary_role(target_profile_id, next_role);
  if next_role = 'teacher' then
    update public.groups as g set teacher_profile_id = null
    where g.teacher_profile_id = target_profile_id and g.age_group_id <> teaching_age_group_id;
  end if;
end;
$$;

revoke all on function public.set_profile_primary_role(bigint, text) from public, anon;
grant execute on function public.set_profile_primary_role(bigint, text) to authenticated;
revoke all on function public.set_profile_primary_role(bigint, text, bigint) from public, anon;
grant execute on function public.set_profile_primary_role(bigint, text, bigint) to authenticated;
