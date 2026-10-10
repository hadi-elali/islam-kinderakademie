-- Gezielte Prüfung der neuen Sicherheitsgrenze; alle Testdaten werden zurückgerollt.
begin;
set local search_path = public, extensions;
select no_plan();

insert into auth.users(id, email, raw_user_meta_data)
select ('61010120-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'scope-test-' || n || '@example.invalid',
  jsonb_build_object('display_name', 'Scope-Test ' || n, 'payment_method', 'bank_transfer',
    'payment_accepted', true, 'payment_payer_name', 'Scope-Test ' || n)
from generate_series(1, 6) n;
create temporary table scope_test_profiles as select id,
  right(auth_user_id::text, 1)::integer as n from public.profiles
  where auth_user_id::text like '61010120-0000-0000-0000-%';
grant select on scope_test_profiles to authenticated;
insert into public.user_roles(profile_id, role) select id, 'admin' from scope_test_profiles where n = 1;
insert into public.age_groups(id, title, min_age, max_age, position)
values(910001, 'Test-Altersgruppe A', 5, 7, 99), (910002, 'Test-Altersgruppe B', 8, 10, 100);
select set_config('request.jwt.claim.sub', '61010120-0000-0000-0000-000000000001', true);
select public.set_profile_primary_role((select id from scope_test_profiles where n = 2), 'teacher', 910001);
select public.set_profile_primary_role((select id from scope_test_profiles where n = 3), 'teacher', 910002);
-- Eine vorhandene Lehrkraft ohne Zuordnung darf keine Inhalte bearbeiten.
insert into public.user_roles(profile_id, role) select id, 'teacher' from scope_test_profiles where n = 6;
insert into public.academy_years(id, title, starts_on, ends_on, is_active)
values(910001, 'Testjahr', '2026-01-01', '2027-12-31', true);
insert into public.learning_journeys(id, academy_year_id, age_group_id, title, is_published)
values(910001, 910001, 910001, 'Reise A', true), (910002, 910001, 910002, 'Reise B', true);
insert into public.lessons(id, learning_journey_id, title, intro_text, status, is_released)
values(910001, 910001, 'Lektion A', 'Einstieg', 'published', true), (910002, 910002, 'Lektion B', 'Einstieg', 'published', true);
insert into public.children(id, parent_profile_id, display_name, birth_date, age_group_id)
select 910000 + n, id, 'Testkind ' || n, '2020-01-01', case when n = 4 then 910001 else 910002 end
from scope_test_profiles where n in (4, 5);
insert into public.groups(id, academy_year_id, age_group_id, name, schedule_label)
values(910001, 910001, 910001, 'Gruppe A', 'Freitag'), (910002, 910001, 910002, 'Gruppe B', 'Samstag');
insert into public.group_members(group_id, child_id, membership_status)
values(910001, 910004, 'approved'), (910002, 910005, 'approved');
insert into storage.objects(bucket_id, name) values
('staff-portraits', (select id::text || '/portrait.png' from scope_test_profiles where n = 2));
select public.set_staff_portrait((select id from scope_test_profiles where n = 2),
  (select id::text || '/portrait.png' from scope_test_profiles where n = 2));

set local role authenticated;
select set_config('request.jwt.claim.sub', '61010120-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from public.lessons where id in (910001, 910002)), 1, 'Lehrkraft sieht nur Lektionen ihrer Altersgruppe');
select lives_ok($$update public.lessons set title = 'Bearbeitet A' where id = 910001$$, 'Eigene Lektion ist bearbeitbar');
with updated as (update public.lessons set title = 'Unzulässig' where id = 910002 returning id) select is((select count(*)::integer from updated), 0, 'Fremde Lektion kann nicht bearbeitet werden');
select throws_ok($$insert into public.lessons(learning_journey_id, title) values(910002, 'Unzulässig')$$, '42501', null, 'Neue Lektion in fremder Altersgruppe wird abgewiesen');
select throws_ok($$update public.lessons set learning_journey_id = 910002 where id = 910001$$, '42501', null, 'Eigene Lektion kann nicht in fremde Altersgruppe verschoben werden');
select throws_ok($$select public.save_multiple_choice_quiz(910002, 'Fremdes Quiz', null, 50, false, '[{"question_text":"Frage","options":[{"option_text":"A","is_correct":true},{"option_text":"B","is_correct":false}]}]'::jsonb)$$, 'P0001', null, 'Quiz-RPC begrenzt SECURITY DEFINER auf die eigene Altersgruppe');
select lives_ok($$select public.save_multiple_choice_quiz(910001, 'Eigenes Quiz', null, 50, false, '[{"question_text":"Frage","options":[{"option_text":"A","is_correct":true},{"option_text":"B","is_correct":false}]}]'::jsonb)$$, 'Quiz-RPC erlaubt die eigene Altersgruppe');
select throws_ok($$select public.set_lesson_release(910001, false)$$, 'P0001', 'Admin role required', 'Manuelle Freigaben bleiben Admins vorbehalten');
select is((select count(*)::integer from public.children where id in (910004, 910005)), 1, 'Nur Kinder der eigenen Altersgruppe sind sichtbar');
with deleted as (delete from public.learning_journeys where id = 910002 returning id) select is((select count(*)::integer from deleted), 0, 'Fremde Lernreise kann nicht gelöscht werden');
select throws_ok($$insert into public.academy_years(title, starts_on, ends_on) values('Unzulässig', '2026-01-01', '2026-12-31')$$, '42501', null, 'Lehrkraft kann keine globalen Akademiejahre verändern');
select throws_ok($$insert into public.staff_profiles(profile_id, age_group_id) values((select id from scope_test_profiles where n = 2), 910002)$$, '42501', null, 'Lehrkraft kann ihre Zuordnung nicht selbst ändern');
select throws_ok($$insert into storage.objects(bucket_id, name) values('staff-portraits', (select id::text || '/unauthorized.png' from scope_test_profiles where n = 2))$$, '42501', null, 'Lehrkraft kann kein Teambild hochladen');
select throws_ok($$select public.set_staff_portrait((select id from scope_test_profiles where n = 2), null)$$, '42501', 'Admin role required', 'Lehrkraft kann ein Teambild nicht entfernen');

select set_config('request.jwt.claim.sub', '61010120-0000-0000-0000-000000000004', true);
select is((select count(*)::integer from public.list_teaching_contacts()), 1, 'Familie sieht ausschließlich die Dozenten ihrer Kinder');
select is((select email from public.list_teaching_contacts()), 'scope-test-2@example.invalid', 'Dozentenkontakt übernimmt die vorhandene Konto-E-Mail');
select is((select display_name from public.list_teaching_contacts()), 'Scope-Test 2', 'Dozentenkontakt übernimmt den vorhandenen Kontonamen');
select is((select count(*)::integer from storage.objects where bucket_id = 'staff-portraits'), 1, 'Familie kann das Bild ihres Dozenten lesen');
select is((select count(*)::integer from public.children where id in (910004, 910005)), 1, 'Familienrechte bleiben auf eigene Kinder beschränkt');
select throws_ok($$select public.set_profile_primary_role((select id from scope_test_profiles where n = 4), 'teacher', 910001)$$, '42501', 'Admin role required', 'Familie kann sich nicht selbst zur Lehrkraft ernennen');

select set_config('request.jwt.claim.sub', '61010120-0000-0000-0000-000000000006', true);
select is((select count(*)::integer from public.lessons where id in (910001, 910002)), 0, 'Nicht zugeordnete Lehrkraft erhält keine Inhaltsrechte');
select set_config('request.jwt.claim.sub', '61010120-0000-0000-0000-000000000001', true);
select throws_ok($$select public.set_profile_primary_role((select id from scope_test_profiles where n = 4), 'teacher', null)$$, 'P0001', null, 'Ernennung zur Lehrkraft erfordert eine Altersgruppe');
select throws_ok($$select public.set_staff_portrait((select id from scope_test_profiles where n = 4), null)$$, 'P0001', null, 'Elternkonten erhalten kein Teambild');
select lives_ok($$select public.set_profile_primary_role((select id from scope_test_profiles where n = 2), 'teacher', 910002)$$, 'Admin kann die Altersgruppe einer Lehrkraft ändern');
select is((select count(*)::integer from public.lessons where id in (910001, 910002)), 2, 'Admin behält Zugriff auf beide Altersgruppen');
select set_config('request.jwt.claim.sub', '61010120-0000-0000-0000-000000000002', true);
select ok(not public.can_manage_lesson(910001) and public.can_manage_lesson(910002), 'Neuzuordnung ersetzt die bisherigen Unterrichtsrechte sofort');
select * from finish();
rollback;
