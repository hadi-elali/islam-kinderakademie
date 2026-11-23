-- Verify real permissions, registration capture, withdrawal and teacher scope.
begin;
set local search_path = public, extensions;
select no_plan();

insert into auth.users(id, email, raw_user_meta_data)
select ('61115120-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'privacy-test-' || n || '@example.invalid',
  jsonb_build_object('display_name', 'Privacy Test ' || n, 'payment_method', 'bank_transfer',
    'payment_accepted', true, 'payment_payer_name', 'Test Payer') ||
  case when n in (1,2) then jsonb_build_object('academy_privacy', jsonb_build_object(
    'version', public.current_privacy_version(), 'guardianConfirmed', true,
    'childDataGranted', true, 'recordingGranted', n = 2)) else '{}'::jsonb end
from generate_series(1,6) n;
create temporary table privacy_test_profiles as select id,
  right(auth_user_id::text, 1)::integer as n from public.profiles
  where auth_user_id::text like '61115120-0000-0000-0000-%';
grant select on privacy_test_profiles to authenticated;
insert into public.user_roles(profile_id, role) select id, 'admin' from privacy_test_profiles where n = 6;
insert into public.age_groups(id, title, min_age, max_age, position)
  values(920001, 'Privacy Test A', 5, 7, 991), (920002, 'Privacy Test B', 8, 10, 992);
select set_config('request.jwt.claim.sub', '61115120-0000-0000-0000-000000000006', true);
select public.set_profile_primary_role((select id from privacy_test_profiles where n=4), 'teacher', 920001);
select public.set_profile_primary_role((select id from privacy_test_profiles where n=5), 'teacher', 920002);
insert into public.children(id, parent_profile_id, display_name, birth_date, age_group_id)
  select 920000+n, id, 'Privacy Test Child ' || n,
    case when n=1 then '2020-01-01'::date else '2017-01-01'::date end, 920000+n
  from privacy_test_profiles where n in (1,2);

select is((select count(*)::integer from public.privacy_consent_events where source='registration'), 4,
  'Registration captures two separate decisions; existing users are not backfilled');
select is((select policy_sha256 from public.privacy_document_versions where version=public.current_privacy_version()),
  (select encode(digest(policy_text, 'sha256'), 'hex') from public.privacy_document_versions where version=public.current_privacy_version()),
  'Archived policy text matches its recorded SHA-256');
select ok(not has_function_privilege('anon', 'public.record_privacy_choices(text,boolean,boolean,boolean)', 'execute'),
  'Anonymous clients cannot record consent');
select ok(not has_function_privilege('authenticated', 'public.has_child_data_consent(bigint)', 'execute'),
  'Private cross-family lookup is not directly exposed');

select throws_ok($$insert into auth.users(id,email,raw_user_meta_data) values('61115120-0000-0000-0000-000000000099',
  'bad-version@example.invalid', '{"academy_privacy":{"version":"invalid","guardianConfirmed":true,"childDataGranted":true,"recordingGranted":false}}')$$,
  '22023', null, 'Registration rejects an unrecognised policy version');

set local role authenticated;
select set_config('request.jwt.claim.sub', '61115120-0000-0000-0000-000000000001', true);
select ok((select child_data_granted and not recording_granted from public.get_privacy_state()),
  'Registration succeeds without an optional recording grant');
select is((select count(*)::integer from public.privacy_consent_events), 2, 'A parent sees only their own consent history');
select throws_ok($$insert into public.privacy_consent_events(auth_user_id,purpose,policy_version,granted,guardian_confirmed,source)
  values('61115120-0000-0000-0000-000000000002','recording','2026-11-23.1',true,true,'account')$$,
  '42501', null, 'A parent cannot forge another parent decision');
select throws_ok($$update public.privacy_consent_events set granted=true$$, '42501', null, 'Recorded decisions cannot be overwritten');
select throws_ok($$delete from public.privacy_consent_events$$, '42501', null, 'Recorded decisions cannot be deleted by clients');
select throws_ok($$update public.privacy_document_versions set child_data_text='changed'$$, '42501', null, 'Clients cannot change archived consent wording');
select throws_ok($$select public.record_privacy_choices('2026-11-23.1',true,true,false)$$, '22023', null, 'A grant requires guardian confirmation');
select throws_ok($$select public.record_privacy_choices('2026-11-23.1',false,true,true)$$, '22023', null, 'Recording cannot be granted without child data consent');
select throws_ok($$select public.record_privacy_choices('old-version',true,false,true)$$, '22023', null, 'The RPC rejects obsolete wording');

select lives_ok($$select public.record_privacy_choices('2026-11-23.1',true,true,true)$$, 'Parent can grant the optional recording separately');
select ok((select recording_granted from public.get_privacy_state()), 'The new recording decision is active');
select lives_ok($$select public.record_privacy_choices('2026-11-23.1',true,false,true)$$, 'Parent can withdraw recording while retaining child functions');
select ok((select child_data_granted and not recording_granted from public.get_privacy_state()), 'Recording withdrawal leaves child data consent intact');
select is((select count(*)::integer from public.privacy_consent_events where purpose='child_data'), 1,
  'Changing the recording choice does not invent a renewed child data consent');
select public.record_privacy_choices('2026-11-23.1',true,false,true);
select is((select count(*)::integer from public.privacy_consent_events where purpose='child_data'), 1,
  'Repeating an unchanged decision preserves its original evidence');
select lives_ok($$select public.record_privacy_choices('2026-11-23.1',false,false,false)$$, 'Parent can withdraw both consents without another guardian grant');
select ok((select not child_data_granted and not recording_granted from public.get_privacy_state()), 'Withdrawal takes effect immediately');
select throws_ok($$update public.children set display_name='New collection' where id=920001$$, '42501', null,
  'New child data writes are rejected after withdrawal');

select set_config('request.jwt.claim.sub', '61115120-0000-0000-0000-000000000003', true);
select ok((select not child_data_granted and not recording_granted from public.get_privacy_state()), 'Existing accounts are not presumed to have consented');
select throws_ok($$insert into public.children(parent_profile_id,display_name,birth_date,age_group_id)
  values((select id from privacy_test_profiles where n=3),'Missing consent','2020-01-01',920001)$$,
  '42501', null, 'A direct API client cannot create children without consent');
select lives_ok($$select public.record_privacy_choices('2026-11-23.1',true,false,true)$$, 'Existing parent can complete the once-only decision');

reset role;
update auth.users set raw_user_meta_data = raw_user_meta_data || '{"academy_privacy":{"version":"2026-11-23.1","guardianConfirmed":true,"childDataGranted":true,"recordingGranted":true}}'
  where id='61115120-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '61115120-0000-0000-0000-000000000001', true);
select ok((select not child_data_granted from public.get_privacy_state()), 'Editing user metadata cannot resurrect withdrawn consent');
select is((select count(*)::integer from public.get_child_recording_permissions()), 0, 'Parents cannot query other families recording decisions');

select set_config('request.jwt.claim.sub', '61115120-0000-0000-0000-000000000004', true);
select is((select count(*)::integer from public.get_child_recording_permissions()), 1, 'Teacher sees only children of their assigned age group');
select ok((select not recording_allowed from public.get_child_recording_permissions() where child_id=920001), 'Teacher sees a withdrawn or missing grant as not allowed');
select set_config('request.jwt.claim.sub', '61115120-0000-0000-0000-000000000005', true);
select ok((select recording_allowed from public.get_child_recording_permissions() where child_id=920002), 'Teacher in the other group sees its actual current grant');
select set_config('request.jwt.claim.sub', '61115120-0000-0000-0000-000000000006', true);
select is((select count(*)::integer from public.get_child_recording_permissions()), 2, 'Administrator can check all recording permissions');

select * from finish();
rollback;
