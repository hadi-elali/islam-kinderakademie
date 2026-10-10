-- Lehrkräfte bearbeiten ausschließlich ihre zugewiesene Altersgruppe.
-- Kontoname und Kontaktadresse bleiben am vorhandenen Profil/Auth-Konto.
create table public.staff_profiles (
  profile_id bigint primary key references public.profiles(id) on delete cascade,
  age_group_id bigint references public.age_groups(id) on delete restrict,
  portrait_path text unique,
  created_at timestamp without time zone not null default now(),
  constraint staff_portrait_path check (
    portrait_path is null or portrait_path like profile_id::text || '/%'
  )
);
insert into public.staff_profiles(profile_id)
select distinct profile_id from public.user_roles where role in ('teacher', 'admin');
alter table public.staff_profiles enable row level security;
revoke all on public.staff_profiles from anon, authenticated;
grant select on public.staff_profiles to authenticated;

create function public.is_scoped_teacher() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_account_role('teacher') and not public.has_account_role('admin')
$$;
create function public.can_manage_age_group(target_age_group_id bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_account_role('admin') or (
    public.has_account_role('teacher') and exists (
      select 1 from public.staff_profiles
      where profile_id = public.current_profile_id() and age_group_id = target_age_group_id
    )
  )
$$;
create function public.can_manage_lesson(target_lesson_id bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lessons l join public.learning_journeys j on j.id = l.learning_journey_id
    where l.id = target_lesson_id and public.can_manage_age_group(j.age_group_id)
  )
$$;
create function public.can_manage_quiz(target_quiz_id bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.lesson_quizzes where id = target_quiz_id and public.can_manage_lesson(lesson_id))
$$;
create function public.can_manage_question(target_question_id bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.quiz_questions where id = target_question_id and public.can_manage_quiz(quiz_id))
$$;
create function public.can_manage_child(target_child_id bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.children where id = target_child_id and public.can_manage_age_group(age_group_id))
$$;
create function public.can_manage_time_group(target_group_id bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.groups where id = target_group_id and public.can_manage_age_group(age_group_id))
$$;
create function public.can_manage_step(target_step_id bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.lesson_steps where id = target_step_id and public.can_manage_lesson(lesson_id))
$$;
create function public.can_manage_attempt(target_attempt_id bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.quiz_attempts where id = target_attempt_id
    and public.can_manage_child(child_id) and public.can_manage_quiz(quiz_id))
$$;
create function public.can_manage_family(target_profile_id bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.children where parent_profile_id = target_profile_id
    and public.can_manage_age_group(age_group_id))
$$;
create function public.can_view_staff_profile(target_profile_id bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_profiles s
    where s.profile_id = target_profile_id
      and exists (select 1 from public.user_roles where profile_id = s.profile_id and role in ('teacher', 'admin'))
      and (
        public.has_account_role('admin') or s.profile_id = public.current_profile_id()
        or public.can_manage_age_group(s.age_group_id)
        or exists (select 1 from public.children where parent_profile_id = public.current_profile_id() and age_group_id = s.age_group_id)
      )
  )
$$;
create policy "Accessible staff profiles" on public.staff_profiles for select to authenticated
using (public.can_view_staff_profile(profile_id));

-- Alter und neue Zuordnung werden atomar gespeichert. Bestandslehrkräfte ohne
-- Zuordnung bekommen keine altersgruppenspezifischen Rechte, bis ein Admin sie zuordnet.
create or replace function public.set_profile_primary_role(target_profile_id bigint, next_role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_account_role('admin') then raise exception 'Admin role required' using errcode = '42501'; end if;
  if next_role is null or next_role not in ('parent', 'teacher', 'admin') then raise exception 'Invalid account role'; end if;
  -- Serialisiert Rollenwechsel und schützt den letzten Admin auch bei parallelen Aufrufen.
  perform pg_catalog.pg_advisory_xact_lock(610101200);
  if not exists (select 1 from public.profiles where id = target_profile_id) then raise exception 'Profile not found'; end if;
  if next_role = 'teacher' and not exists (
    select 1 from public.staff_profiles where profile_id = target_profile_id and age_group_id is not null
  ) then raise exception 'Eine Altersgruppe für die Lehrkraft ist erforderlich.'; end if;
  if next_role <> 'admin' and exists (
    select 1 from public.user_roles where profile_id = target_profile_id and role = 'admin'
  ) and (select count(*) from public.user_roles where role = 'admin') <= 1 then
    raise exception 'The last admin cannot be demoted';
  end if;
  delete from public.user_roles where profile_id = target_profile_id;
  insert into public.user_roles(profile_id, role) values(target_profile_id, next_role);
  if next_role = 'admin' then
    insert into public.user_roles(profile_id, role) values(target_profile_id, 'parent') on conflict do nothing;
  end if;
  if next_role <> 'teacher' then
    update public.staff_profiles set age_group_id = null where profile_id = target_profile_id;
  end if;
  if next_role = 'parent' then
    update public.groups set teacher_profile_id = null where teacher_profile_id = target_profile_id;
  end if;
end;
$$;
create function public.set_profile_primary_role(
  target_profile_id bigint, next_role text, teaching_age_group_id bigint
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_account_role('admin') then raise exception 'Admin role required' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(610101200);
  if next_role = 'teacher' and teaching_age_group_id is null then
    raise exception 'Eine Altersgruppe für die Lehrkraft ist erforderlich.';
  end if;
  if next_role in ('teacher', 'admin') then
    insert into public.staff_profiles(profile_id, age_group_id)
    values(target_profile_id, case when next_role = 'teacher' then teaching_age_group_id end)
    on conflict (profile_id) do update set age_group_id = excluded.age_group_id;
  end if;
  perform public.set_profile_primary_role(target_profile_id, next_role);
  if next_role = 'teacher' then
    update public.groups set teacher_profile_id = null
    where teacher_profile_id = target_profile_id and age_group_id <> teaching_age_group_id;
  end if;
end;
$$;

drop function public.list_admin_accounts();
create function public.list_admin_accounts()
returns table(profile_id bigint, display_name text, email text, account_role text,
  profile_created_at timestamp without time zone, age_group_id bigint, portrait_path text)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_account_role('admin') then raise exception 'Admin role required' using errcode = '42501'; end if;
  return query select p.id, p.display_name, u.email::text,
    case when exists(select 1 from public.user_roles where profile_id = p.id and role = 'admin') then 'admin'
         when exists(select 1 from public.user_roles where profile_id = p.id and role = 'teacher') then 'teacher' else 'parent' end,
    p.created_at, s.age_group_id, s.portrait_path
  from public.profiles p join auth.users u on u.id = p.auth_user_id
  left join public.staff_profiles s on s.profile_id = p.id order by p.created_at desc, p.id desc;
end;
$$;
create function public.list_teaching_contacts()
returns table(profile_id bigint, display_name text, email text, account_role text, age_group_id bigint, portrait_path text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name, u.email::text,
    case when public.has_account_role('admin') and exists(select 1 from public.user_roles where profile_id = p.id and role = 'admin')
      then 'admin' else 'teacher' end,
    s.age_group_id, s.portrait_path
  from public.staff_profiles s join public.profiles p on p.id = s.profile_id
  join auth.users u on u.id = p.auth_user_id
  where public.can_view_staff_profile(p.id)
  order by p.display_name, p.id
$$;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('staff-portraits', 'staff-portraits', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict(id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create function public.can_read_staff_portrait(target_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_account_role('admin') or exists (
    select 1 from public.staff_profiles where portrait_path = target_path and public.can_view_staff_profile(profile_id)
  )
$$;
create function public.can_upload_staff_portrait(target_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_account_role('admin') and exists (
    select 1 from public.user_roles where role in ('teacher', 'admin')
      and profile_id::text = split_part(target_path, '/', 1)
  )
$$;
create policy "View accessible staff portraits" on storage.objects for select to authenticated
using (bucket_id = 'staff-portraits' and public.can_read_staff_portrait(name));
create policy "Admins upload staff portraits" on storage.objects for insert to authenticated
with check (bucket_id = 'staff-portraits' and public.can_upload_staff_portrait(name));
create policy "Admins delete staff portraits" on storage.objects for delete to authenticated
using (bucket_id = 'staff-portraits' and public.has_account_role('admin'));
create function public.set_staff_portrait(target_profile_id bigint, new_portrait_path text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_account_role('admin') then raise exception 'Admin role required' using errcode = '42501'; end if;
  if not exists (select 1 from public.user_roles where profile_id = target_profile_id and role in ('teacher', 'admin')) then
    raise exception 'Portraits require a teacher or admin account';
  end if;
  if new_portrait_path is not null and (
    new_portrait_path not like target_profile_id::text || '/%'
    or not exists(select 1 from storage.objects where bucket_id = 'staff-portraits' and name = new_portrait_path)
  ) then raise exception 'Invalid staff portrait'; end if;
  insert into public.staff_profiles(profile_id, portrait_path) values(target_profile_id, new_portrait_path)
  on conflict(profile_id) do update set portrait_path = excluded.portrait_path;
end;
$$;

-- Allgemeine Medien und Abzeichendefinitionen können optional einer Altersgruppe gehören.
alter table public.media_assets add column age_group_id bigint references public.age_groups(id) on delete restrict;
alter table public.badges add column age_group_id bigint references public.age_groups(id) on delete restrict;
create index media_assets_age_group_idx on public.media_assets(age_group_id);
create index badges_age_group_idx on public.badges(age_group_id);
update public.media_assets a set age_group_id = j.age_group_id
from public.lesson_documents d join public.lessons l on l.id = d.lesson_id
join public.learning_journeys j on j.id = l.learning_journey_id where d.media_asset_id = a.id;

-- Restriktive Policies ergänzen bestehende Familien- und Admin-Regeln und
-- verhindern, dass bisherige allgemeine Team-Policies die Grenze umgehen.
create policy "Teacher age group boundary" on public.learning_journeys as restrictive for all to authenticated
using (not public.is_scoped_teacher() or (public.can_manage_age_group(age_group_id))) with check (not public.is_scoped_teacher() or (public.can_manage_age_group(age_group_id)));


create policy "Teacher age group boundary" on public.lessons as restrictive for all to authenticated
using (not public.is_scoped_teacher() or (exists (select 1 from public.learning_journeys j where j.id = learning_journey_id and public.can_manage_age_group(j.age_group_id)))) with check (not public.is_scoped_teacher() or (exists (select 1 from public.learning_journeys j where j.id = learning_journey_id and public.can_manage_age_group(j.age_group_id))));


create policy "Teacher age group boundary" on public.lesson_steps as restrictive for all to authenticated
using (not public.is_scoped_teacher() or (public.can_manage_lesson(lesson_id))) with check (not public.is_scoped_teacher() or (public.can_manage_lesson(lesson_id)));


create policy "Teacher age group boundary" on public.lesson_quizzes as restrictive for all to authenticated
using (not public.is_scoped_teacher() or (public.can_manage_lesson(lesson_id))) with check (not public.is_scoped_teacher() or (public.can_manage_lesson(lesson_id)));


create policy "Teacher age group boundary" on public.quiz_questions as restrictive for all to authenticated
using (not public.is_scoped_teacher() or (public.can_manage_quiz(quiz_id))) with check (not public.is_scoped_teacher() or (public.can_manage_quiz(quiz_id)));


create policy "Teacher age group boundary" on public.quiz_options as restrictive for all to authenticated
using (not public.is_scoped_teacher() or (public.can_manage_question(question_id))) with check (not public.is_scoped_teacher() or (public.can_manage_question(question_id)));


create policy "Teacher age group boundary" on public.quiz_answer_keys as restrictive for all to authenticated
using (not public.is_scoped_teacher() or (public.can_manage_question(question_id))) with check (not public.is_scoped_teacher() or (public.can_manage_question(question_id)));


create policy "Teacher age group boundary" on public.groups as restrictive for all to authenticated
using (not public.is_scoped_teacher() or (public.can_manage_age_group(age_group_id))) with check (not public.is_scoped_teacher() or (public.can_manage_age_group(age_group_id)));


create policy "Teacher age group boundary" on public.children as restrictive for all to authenticated
using (not public.is_scoped_teacher() or (public.can_manage_age_group(age_group_id))) with check (not public.is_scoped_teacher() or (public.can_manage_age_group(age_group_id)));


create policy "Teacher age group boundary" on public.group_members as restrictive for all to authenticated
using (not public.is_scoped_teacher() or (public.can_manage_child(child_id) and public.can_manage_time_group(group_id))) with check (not public.is_scoped_teacher() or (public.can_manage_child(child_id) and public.can_manage_time_group(group_id)));


create policy "Teacher age group boundary" on public.live_sessions as restrictive for all to authenticated
using (not public.is_scoped_teacher() or (public.can_manage_lesson(lesson_id) and (group_id is null or public.can_manage_time_group(group_id)))) with check (not public.is_scoped_teacher() or (public.can_manage_lesson(lesson_id) and (group_id is null or public.can_manage_time_group(group_id))));


create policy "Teacher age group boundary" on public.lesson_documents as restrictive for all to authenticated
using (not public.is_scoped_teacher() or (public.can_manage_lesson(lesson_id))) with check (not public.is_scoped_teacher() or (public.can_manage_lesson(lesson_id)));


create policy "Teacher age group boundary" on public.quiz_attempts as restrictive for all to authenticated
using (not public.is_scoped_teacher() or (public.can_manage_child(child_id) and public.can_manage_quiz(quiz_id))) with check (not public.is_scoped_teacher() or (public.can_manage_child(child_id) and public.can_manage_quiz(quiz_id)));


create policy "Teacher age group boundary" on public.quiz_attempt_answers as restrictive for all to authenticated
using (not public.is_scoped_teacher() or (public.can_manage_attempt(attempt_id) and public.can_manage_question(question_id))) with check (not public.is_scoped_teacher() or (public.can_manage_attempt(attempt_id) and public.can_manage_question(question_id)));


create policy "Teacher age group boundary" on public.child_lesson_progress as restrictive for all to authenticated
using (not public.is_scoped_teacher() or (public.can_manage_child(child_id) and public.can_manage_lesson(lesson_id))) with check (not public.is_scoped_teacher() or (public.can_manage_child(child_id) and public.can_manage_lesson(lesson_id)));


create policy "Teacher age group boundary" on public.child_step_progress as restrictive for all to authenticated
using (not public.is_scoped_teacher() or (public.can_manage_child(child_id) and public.can_manage_step(lesson_step_id))) with check (not public.is_scoped_teacher() or (public.can_manage_child(child_id) and public.can_manage_step(lesson_step_id)));


create policy "Teacher age group boundary" on public.submissions as restrictive for all to authenticated
using (not public.is_scoped_teacher() or (public.can_manage_child(child_id) and public.can_manage_lesson(lesson_id) and (lesson_step_id is null or public.can_manage_step(lesson_step_id)))) with check (not public.is_scoped_teacher() or (public.can_manage_child(child_id) and public.can_manage_lesson(lesson_id) and (lesson_step_id is null or public.can_manage_step(lesson_step_id))));


create policy "Teacher age group boundary" on public.child_badges as restrictive for all to authenticated
using (not public.is_scoped_teacher() or (
  public.can_manage_child(child_id) and (lesson_id is null or public.can_manage_lesson(lesson_id))
  and exists(select 1 from public.badges b where b.id = badge_id and (b.age_group_id is null or public.can_manage_age_group(b.age_group_id)))
)) with check (not public.is_scoped_teacher() or (
  public.can_manage_child(child_id) and (lesson_id is null or public.can_manage_lesson(lesson_id))
  and exists(select 1 from public.badges b where b.id = badge_id and (b.age_group_id is null or public.can_manage_age_group(b.age_group_id)))
));


create policy "Teacher age group boundary" on public.profiles as restrictive for all to authenticated
using (not public.is_scoped_teacher() or (id = public.current_profile_id() or public.can_manage_family(id) or public.can_view_staff_profile(id))) with check (not public.is_scoped_teacher() or (id = public.current_profile_id() or public.can_manage_family(id) or public.can_view_staff_profile(id)));


create policy "Only admins change shared structure insert" on public.academy_years as restrictive for insert to authenticated  with check (not public.is_scoped_teacher());


create policy "Only admins change shared structure update" on public.academy_years as restrictive for update to authenticated using (not public.is_scoped_teacher()) with check (not public.is_scoped_teacher());


create policy "Only admins change shared structure delete" on public.academy_years as restrictive for delete to authenticated using (not public.is_scoped_teacher()) ;


create policy "Teacher owns age group insert" on public.badges as restrictive for insert to authenticated  with check (not public.is_scoped_teacher() or public.can_manage_age_group(age_group_id));


create policy "Teacher owns age group update" on public.badges as restrictive for update to authenticated using (not public.is_scoped_teacher() or public.can_manage_age_group(age_group_id)) with check (not public.is_scoped_teacher() or public.can_manage_age_group(age_group_id));


create policy "Teacher owns age group delete" on public.badges as restrictive for delete to authenticated using (not public.is_scoped_teacher() or public.can_manage_age_group(age_group_id)) ;


create policy "Teacher owns age group insert" on public.media_assets as restrictive for insert to authenticated  with check (not public.is_scoped_teacher() or public.can_manage_age_group(age_group_id));


create policy "Teacher owns age group update" on public.media_assets as restrictive for update to authenticated using (not public.is_scoped_teacher() or public.can_manage_age_group(age_group_id)) with check (not public.is_scoped_teacher() or public.can_manage_age_group(age_group_id));


create policy "Teacher owns age group delete" on public.media_assets as restrictive for delete to authenticated using (not public.is_scoped_teacher() or public.can_manage_age_group(age_group_id)) ;


create policy "Teacher sees relevant badge definitions" on public.badges as restrictive for select to authenticated
using (not public.is_scoped_teacher() or age_group_id is null or public.can_manage_age_group(age_group_id));
create function public.can_manage_message(target_audience text, target_recipient bigint, target_group bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_account_role('admin') or (
    public.has_account_role('teacher') and (
      (target_audience = 'group' and public.can_manage_time_group(target_group))
      or (target_audience = 'profile' and public.can_manage_family(target_recipient))
    )
  )
$$;
create policy "Teacher sees relevant messages" on public.messages as restrictive for select to authenticated
using (not public.is_scoped_teacher() or audience = 'all' or recipient_profile_id = public.current_profile_id()
  or public.can_manage_message(audience, recipient_profile_id, group_id));
create policy "Teacher sends within age group" on public.messages as restrictive for insert to authenticated
with check (not public.is_scoped_teacher() or (
  sender_profile_id = public.current_profile_id() and public.can_manage_message(audience, recipient_profile_id, group_id)));
create policy "Teacher edits within age group" on public.messages as restrictive for update to authenticated
using (not public.is_scoped_teacher() or public.can_manage_message(audience, recipient_profile_id, group_id))
with check (not public.is_scoped_teacher() or (
  sender_profile_id = public.current_profile_id() and public.can_manage_message(audience, recipient_profile_id, group_id)));
create policy "Teacher deletes within age group" on public.messages as restrictive for delete to authenticated
using (not public.is_scoped_teacher() or public.can_manage_message(audience, recipient_profile_id, group_id));


create or replace function public.save_multiple_choice_quiz(
  target_lesson_id bigint,
  quiz_title text,
  quiz_description text,
  required_passing_percent integer,
  publish_quiz boolean,
  question_definitions jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_quiz_id bigint;
  saved_question_id bigint;
  saved_option_id bigint;
  correct_option_id bigint;
  question_definition jsonb;
  option_definition jsonb;
  question_position integer;
  option_position integer;
  correct_option_count integer;
begin
  if not public.can_manage_lesson(target_lesson_id) then
    raise exception 'Keine Berechtigung für die Altersgruppe dieser Lektion.';
  end if;

  if not exists (select 1 from public.lessons where id = target_lesson_id) then
    raise exception 'Lesson not found';
  end if;

  if coalesce(nullif(trim(quiz_title), ''), '') = '' then
    raise exception 'Quiz title required';
  end if;

  if required_passing_percent not between 0 and 100 then
    raise exception 'Passing percent must be between 0 and 100';
  end if;

  if coalesce(jsonb_typeof(question_definitions), 'null') <> 'array'
    or jsonb_array_length(question_definitions) = 0 then
    raise exception 'At least one quiz question is required';
  end if;

  insert into public.lesson_quizzes (
    lesson_id,
    title,
    description,
    passing_percent,
    is_published
  )
  values (
    target_lesson_id,
    trim(quiz_title),
    nullif(trim(quiz_description), ''),
    required_passing_percent,
    publish_quiz
  )
  on conflict (lesson_id) do update
  set
    title = excluded.title,
    description = excluded.description,
    passing_percent = excluded.passing_percent,
    is_published = excluded.is_published
  returning id into saved_quiz_id;

  -- Bei strukturellen Aenderungen beginnen Versuche und Fortschritt neu.
  delete from public.quiz_attempts where quiz_id = saved_quiz_id;
  delete from public.child_lesson_progress where lesson_id = target_lesson_id;
  delete from public.quiz_questions where quiz_id = saved_quiz_id;

  question_position := 0;
  for question_definition in
    select value from jsonb_array_elements(question_definitions)
  loop
    if coalesce(nullif(trim(question_definition ->> 'question_text'), ''), '') = '' then
      raise exception 'Every quiz question needs text';
    end if;

    if coalesce(jsonb_typeof(question_definition -> 'options'), 'null') <> 'array'
      or jsonb_array_length(question_definition -> 'options') < 2 then
      raise exception 'Every quiz question needs at least two options';
    end if;

    select count(*)
    into correct_option_count
    from jsonb_array_elements(question_definition -> 'options') as option_row(value)
    where coalesce((option_row.value ->> 'is_correct')::boolean, false);

    if correct_option_count <> 1 then
      raise exception 'Every quiz question needs exactly one correct option';
    end if;

    insert into public.quiz_questions (quiz_id, question_text, position)
    values (saved_quiz_id, trim(question_definition ->> 'question_text'), question_position)
    returning id into saved_question_id;

    option_position := 0;
    correct_option_id := null;

    for option_definition in
      select value from jsonb_array_elements(question_definition -> 'options')
    loop
      if coalesce(nullif(trim(option_definition ->> 'option_text'), ''), '') = '' then
        raise exception 'Every quiz option needs text';
      end if;

      insert into public.quiz_options (question_id, option_text, position)
      values (saved_question_id, trim(option_definition ->> 'option_text'), option_position)
      returning id into saved_option_id;

      if coalesce((option_definition ->> 'is_correct')::boolean, false) then
        correct_option_id := saved_option_id;
      end if;

      option_position := option_position + 1;
    end loop;

    insert into public.quiz_answer_keys (question_id, correct_option_id, explanation)
    values (
      saved_question_id,
      correct_option_id,
      nullif(trim(question_definition ->> 'explanation'), '')
    );

    question_position := question_position + 1;
  end loop;

  return saved_quiz_id;
end;
$$;

create or replace function public.can_child_access_lesson(
  target_child_id bigint,
  target_lesson_id bigint
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.children as child
    join public.lessons as lesson
      on lesson.id = target_lesson_id
    join public.learning_journeys as journey
      on journey.id = lesson.learning_journey_id
    join public.academy_years as academy_year
      on academy_year.id = journey.academy_year_id
    where child.id = target_child_id
      and (
        (public.can_manage_age_group(child.age_group_id) and public.can_manage_age_group(journey.age_group_id))
        or (
          child.parent_profile_id = public.current_profile_id()
          and lesson.status = 'published'
          and lesson.is_released
          and journey.is_published
          and academy_year.is_active
          and journey.age_group_id = child.age_group_id
          and exists (
            select 1
            from public.group_members as membership
            join public.groups as time_group
              on time_group.id = membership.group_id
            where membership.child_id = child.id
              and membership.membership_status = 'approved'
              and time_group.age_group_id = child.age_group_id
              and time_group.academy_year_id = journey.academy_year_id
          )
        )
      )
  )
$$;

create or replace function public.review_multiple_choice_quiz_attempt(
  target_attempt_id bigint
)
returns table (
  question_id bigint,
  selected_option_id bigint,
  is_correct boolean,
  correct_option_id bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.quiz_attempts as attempt
    where attempt.id = target_attempt_id
      and (
        public.owns_child(attempt.child_id)
        or (public.can_manage_child(attempt.child_id) and public.can_manage_quiz(attempt.quiz_id))
      )
  ) then
    raise exception 'Quiz attempt cannot be reviewed'
      using errcode = '42501';
  end if;

  return query
  select
    answer.question_id,
    answer.selected_option_id,
    answer.is_correct,
    answer_key.correct_option_id
  from public.quiz_attempt_answers as answer
  join public.quiz_questions as question
    on question.id = answer.question_id
  join public.quiz_answer_keys as answer_key
    on answer_key.question_id = answer.question_id
  where answer.attempt_id = target_attempt_id
  order by question.position, question.id;
end;
$$;

create or replace function public.can_child_access_learning_content(
  target_child_id bigint
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_manage_child(target_child_id)
    or exists (
      select 1
      from public.children as child
      join public.group_members as membership
        on membership.child_id = child.id
      join public.groups as time_group
        on time_group.id = membership.group_id
      join public.academy_years as academy_year
        on academy_year.id = time_group.academy_year_id
      where child.id = target_child_id
        and child.parent_profile_id = public.current_profile_id()
        and membership.membership_status = 'approved'
        and time_group.age_group_id = child.age_group_id
        and academy_year.is_active
    )
$$;

create or replace function public.can_access_age_group_learning_content(
  target_age_group_id bigint,
  target_academy_year_id bigint
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_manage_age_group(target_age_group_id)
    or exists (
      select 1
      from public.children as child
      join public.group_members as membership
        on membership.child_id = child.id
      join public.groups as time_group
        on time_group.id = membership.group_id
      join public.academy_years as academy_year
        on academy_year.id = time_group.academy_year_id
      where child.parent_profile_id = public.current_profile_id()
        and child.age_group_id = target_age_group_id
        and membership.membership_status = 'approved'
        and time_group.age_group_id = target_age_group_id
        and time_group.academy_year_id = target_academy_year_id
        and academy_year.is_active
    )
$$;

create or replace function public.can_access_group(target_group_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_manage_time_group(target_group_id)
    or exists (
      select 1
      from public.group_members as membership
      join public.children as child on child.id = membership.child_id
      where membership.group_id = target_group_id
        and membership.membership_status = 'approved'
        and child.parent_profile_id = public.current_profile_id()
    )
$$;

create or replace function public.can_access_academy_media_object(target_bucket text, target_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_account_role('admin') or exists (
    select 1 from public.media_assets a
    where a.bucket_name = target_bucket and a.storage_path = target_path
      and (
        public.can_manage_age_group(a.age_group_id)
        or exists (
          select 1 from public.lesson_documents d join public.lessons l on l.id = d.lesson_id
          join public.learning_journeys j on j.id = l.learning_journey_id
          join public.academy_years y on y.id = j.academy_year_id
          where d.media_asset_id = a.id and (
            public.can_manage_age_group(j.age_group_id)
            or (l.status = 'published' and l.is_released and j.is_published and y.is_active
              and public.can_access_age_group_learning_content(j.age_group_id, j.academy_year_id))
          )
        )
      )
  )
$$;
create or replace function public.can_manage_academy_media_object(target_bucket text, target_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_account_role('admin') or (
    public.has_account_role('teacher') and (
      exists(select 1 from public.media_assets a where a.bucket_name = target_bucket and a.storage_path = target_path
        and public.can_manage_age_group(a.age_group_id))
      -- Allows cleanup after an interrupted upload, but only within the teacher's own folder.
      or (split_part(target_path, '/', 1) = public.current_profile_id()::text
        and not exists(select 1 from public.media_assets where bucket_name = target_bucket and storage_path = target_path))
    ) and not exists (
      select 1 from public.media_assets a join public.lesson_documents d on d.media_asset_id = a.id
      where a.bucket_name = target_bucket and a.storage_path = target_path
    )
  )
$$;
create policy "Teacher uploads own media objects" on storage.objects as restrictive for insert to authenticated
with check (not public.is_scoped_teacher() or (
  bucket_id = 'academy-media' and split_part(name, '/', 1) = public.current_profile_id()::text
  and exists(select 1 from public.staff_profiles where profile_id = public.current_profile_id() and age_group_id is not null)
));
-- WITH CHECK evaluates the new metadata; a teacher cannot relabel an object
-- from another age group or attach an existing admin object to their own group.
create policy "Teacher uploads own media metadata" on public.media_assets as restrictive for insert to authenticated
with check (not public.is_scoped_teacher() or (
  uploaded_by_profile_id = public.current_profile_id() and bucket_name = 'academy-media'
  and split_part(storage_path, '/', 1) = public.current_profile_id()::text
));
create function public.keep_media_object_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.is_scoped_teacher() and (
    new.storage_path is distinct from old.storage_path or new.bucket_name is distinct from old.bucket_name
    or new.uploaded_by_profile_id is distinct from old.uploaded_by_profile_id
  ) then raise exception 'Media object identity cannot be changed' using errcode = '42501'; end if;
  return new;
end;
$$;
create trigger keep_media_object_identity before update on public.media_assets
for each row execute function public.keep_media_object_identity();


revoke all on function public.is_scoped_teacher() from public, anon;
grant execute on function public.is_scoped_teacher() to authenticated;

revoke all on function public.can_manage_age_group(bigint) from public, anon;
grant execute on function public.can_manage_age_group(bigint) to authenticated;

revoke all on function public.can_manage_lesson(bigint) from public, anon;
grant execute on function public.can_manage_lesson(bigint) to authenticated;

revoke all on function public.can_manage_quiz(bigint) from public, anon;
grant execute on function public.can_manage_quiz(bigint) to authenticated;

revoke all on function public.can_manage_question(bigint) from public, anon;
grant execute on function public.can_manage_question(bigint) to authenticated;

revoke all on function public.can_manage_child(bigint) from public, anon;
grant execute on function public.can_manage_child(bigint) to authenticated;

revoke all on function public.can_manage_time_group(bigint) from public, anon;
grant execute on function public.can_manage_time_group(bigint) to authenticated;

revoke all on function public.can_manage_step(bigint) from public, anon;
grant execute on function public.can_manage_step(bigint) to authenticated;

revoke all on function public.can_manage_attempt(bigint) from public, anon;
grant execute on function public.can_manage_attempt(bigint) to authenticated;

revoke all on function public.can_manage_family(bigint) from public, anon;
grant execute on function public.can_manage_family(bigint) to authenticated;

revoke all on function public.can_view_staff_profile(bigint) from public, anon;
grant execute on function public.can_view_staff_profile(bigint) to authenticated;

revoke all on function public.can_read_staff_portrait(text) from public, anon;
grant execute on function public.can_read_staff_portrait(text) to authenticated;

revoke all on function public.can_upload_staff_portrait(text) from public, anon;
grant execute on function public.can_upload_staff_portrait(text) to authenticated;

revoke all on function public.can_manage_message(text, bigint, bigint) from public, anon;
grant execute on function public.can_manage_message(text, bigint, bigint) to authenticated;

revoke all on function public.set_profile_primary_role(bigint, text, bigint) from public, anon;
grant execute on function public.set_profile_primary_role(bigint, text, bigint) to authenticated;

revoke all on function public.set_staff_portrait(bigint, text) from public, anon;
grant execute on function public.set_staff_portrait(bigint, text) to authenticated;

revoke all on function public.list_admin_accounts() from public, anon;
grant execute on function public.list_admin_accounts() to authenticated;

revoke all on function public.list_teaching_contacts() from public, anon;
grant execute on function public.list_teaching_contacts() to authenticated;

revoke all on function public.keep_media_object_identity() from public, anon, authenticated;

-- Bei INSERT ... RETURNING wird die Altersgruppe der neuen Metadaten direkt
-- geprüft; die Zeile muss dafür noch nicht über einen Tabellen-Lookup sichtbar sein.
drop policy "Members can read accessible academy media" on public.media_assets;
create policy "Members can read accessible academy media" on public.media_assets for select to authenticated
using (public.can_manage_age_group(age_group_id) or public.can_access_academy_media_object(bucket_name, storage_path));
