-- SELECT only: technical IDs and aggregate byte lengths, no record contents.
select jsonb_build_object(
  'payloads', (select jsonb_agg(to_jsonb(s)) from (
select 'profiles' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.profiles t
union all
select 'user_roles' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.user_roles t
union all
select 'academy_years' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.academy_years t
union all
select 'age_groups' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.age_groups t
union all
select 'children' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.children t
union all
select 'learning_journeys' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.learning_journeys t
union all
select 'lessons' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.lessons t
union all
select 'lesson_steps' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.lesson_steps t
union all
select 'groups' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.groups t
union all
select 'group_members' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.group_members t
union all
select 'live_sessions' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.live_sessions t
union all
select 'lesson_quizzes' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.lesson_quizzes t
union all
select 'quiz_questions' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.quiz_questions t
union all
select 'quiz_options' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.quiz_options t
union all
select 'quiz_answer_keys' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.quiz_answer_keys t
union all
select 'quiz_attempts' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.quiz_attempts t
union all
select 'quiz_attempt_answers' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.quiz_attempt_answers t
union all
select 'child_lesson_progress' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.child_lesson_progress t
union all
select 'child_step_progress' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.child_step_progress t
union all
select 'submissions' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.submissions t
union all
select 'badges' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.badges t
union all
select 'child_badges' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.child_badges t
union all
select 'media_assets' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.media_assets t
union all
select 'lesson_documents' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.lesson_documents t
union all
select 'messages' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.messages t
union all
select 'message_reads' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.message_reads t
union all
select 'payment_agreements' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.payment_agreements t
union all
select 'monthly_payments' as table_name, count(*) as rows, coalesce(sum(octet_length(row_to_json(t)::text)),0) as uncompressed_json_bytes, coalesce(max(octet_length(row_to_json(t)::text)),0) as largest_row_bytes from public.monthly_payments t
  ) s),
  'storage_links', (select jsonb_agg(to_jsonb(s)) from (
    select o.bucket_id, md5(o.bucket_id || '/' || o.name) as object_id,
      (o.metadata->>'size')::bigint as size_bytes,
      a.id as media_asset_id, d.lesson_id,
      l.status as lesson_status, l.is_released,
      j.is_published as journey_published, y.is_active as year_active
    from storage.objects o
    left join public.media_assets a on a.bucket_name=o.bucket_id and a.storage_path=o.name
    left join public.lesson_documents d on d.media_asset_id=a.id
    left join public.lessons l on l.id=d.lesson_id
    left join public.learning_journeys j on j.id=l.learning_journey_id
    left join public.academy_years y on y.id=j.academy_year_id
    where o.bucket_id='academy-media' and o.metadata->>'size' ~ '^[0-9]+$'
    order by (o.metadata->>'size')::bigint desc
  ) s)
) as egress_payload_summary;
