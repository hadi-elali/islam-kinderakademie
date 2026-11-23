-- Real registration capture, immutable history and purpose-specific compatibility.
begin;
set local search_path = public, extensions;
select no_plan();

insert into auth.users(id,email,raw_user_meta_data)
select ('61123120-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid,
  'captcha-test-' || n || '@example.invalid',
  jsonb_build_object('display_name','CAPTCHA Test','payment_method','bank_transfer',
    'payment_accepted',true,'payment_payer_name','Test Payer') ||
  case when n=1 then jsonb_build_object('academy_privacy',jsonb_build_object(
    'version',public.current_privacy_version(),'guardianConfirmed',true,
    'childDataGranted',true,'recordingGranted',false,'hcaptchaGranted',true)) else '{}'::jsonb end
from generate_series(1,2) n;

select is((select count(*)::integer from public.privacy_consent_events
  where auth_user_id='61123120-0000-0000-0000-000000000001' and purpose='hcaptcha'),1,
  'Explicit registration decision creates one CAPTCHA evidence event');
select is((select count(*)::integer from public.privacy_consent_events
  where auth_user_id='61123120-0000-0000-0000-000000000002'),0,
  'A manually created account has no inferred consent');
select ok((select length(captcha_text)>100 from public.privacy_document_versions
  where version=public.current_privacy_version()), 'Exact CAPTCHA consent text is archived');
select is((select policy_sha256 from public.privacy_document_versions where version='2026-11-15.1'),
  '7b0f0e54cb5e300cf7e4249121bddf8ad6cad8513fff5cab76dec5d503ddbd7d',
  'Previously applied policy snapshot remains unchanged');
select is((select encode(digest(policy_text,'sha256'),'hex') from public.privacy_document_versions where version='2026-11-15.1'),
  '7b0f0e54cb5e300cf7e4249121bddf8ad6cad8513fff5cab76dec5d503ddbd7d',
  'Old archived policy still has its original content');
update auth.users set raw_user_meta_data=raw_user_meta_data || '{"academy_privacy":{"hcaptchaGranted":true}}'
  where id='61123120-0000-0000-0000-000000000002';
select is((select count(*)::integer from public.privacy_consent_events
  where auth_user_id='61123120-0000-0000-0000-000000000002'),0,
  'Editable metadata cannot manufacture later CAPTCHA evidence');

insert into public.privacy_consent_events(auth_user_id,purpose,policy_version,granted,guardian_confirmed,source)
values ('61123120-0000-0000-0000-000000000002','child_data','2026-11-15.1',true,true,'account'),
  ('61123120-0000-0000-0000-000000000002','recording','2026-11-15.1',true,true,'account');
set local role authenticated;
select set_config('request.jwt.claim.sub','61123120-0000-0000-0000-000000000002',true);
select ok((select child_data_granted and recording_granted from public.get_privacy_state()),
  'Unchanged older child/recording texts remain effective without another decision');
select is((select count(*)::integer from public.privacy_consent_events),2,
  'Reading compatible decisions never fabricates replacement events');
select throws_ok($$insert into public.privacy_consent_events(auth_user_id,purpose,policy_version,granted,guardian_confirmed,source)
  values('61123120-0000-0000-0000-000000000002','hcaptcha','2026-11-23.1',true,true,'account')$$,
  '42501',null,'Client cannot insert arbitrary CAPTCHA evidence');
select public.record_privacy_choices('2026-11-23.1',false,false,false);
select ok((select not child_data_granted and not recording_granted from public.get_privacy_state()),
  'New withdrawal takes priority over compatible old grants');
reset role;
select ok(not public.privacy_purpose_version_is_current('unknown','child_data'),
  'Unknown text versions never become compatible');
select ok(not public.privacy_purpose_version_is_current('2026-11-15.1','hcaptcha'),
  'Child/recording compatibility does not imply CAPTCHA consent');
update public.privacy_document_versions set recording_text='Different recording purpose' where version='2026-11-15.1';
select ok(not public.privacy_purpose_version_is_current('2026-11-15.1','recording'),
  'A changed purpose text invalidates compatibility');
select ok(public.privacy_purpose_version_is_current('2026-11-15.1','child_data'),
  'A recording-text change alone does not invalidate child-data scope');
select * from finish();
rollback;
