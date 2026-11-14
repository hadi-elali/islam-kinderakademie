-- Read-only inventory: no record contents, object paths, or credentials.
select jsonb_build_object(
  'measured_at_utc', timezone('utc', now()),
  'database_bytes', pg_database_size(current_database()),
  'storage', (
    select coalesce(jsonb_agg(to_jsonb(summary)), '[]'::jsonb) from (
      select bucket_id,
        coalesce(nullif(metadata ->> 'mimetype', ''), 'unknown') as mime_type,
        count(*) as files,
        sum(case when metadata ->> 'size' ~ '^[0-9]+$' then (metadata ->> 'size')::bigint end) as total_bytes,
        max(case when metadata ->> 'size' ~ '^[0-9]+$' then (metadata ->> 'size')::bigint end) as largest_file_bytes
      from storage.objects
      group by bucket_id, mime_type
      order by total_bytes desc nulls last
    ) summary
  ),
  'largest_files', (
    select coalesce(jsonb_agg(to_jsonb(summary)), '[]'::jsonb) from (
      select bucket_id, md5(bucket_id || '/' || name) as object_id,
        metadata ->> 'mimetype' as mime_type,
        (metadata ->> 'size')::bigint as size_bytes
      from storage.objects
      where metadata ->> 'size' ~ '^[0-9]+$'
      order by size_bytes desc limit 10
    ) summary
  ),
  'public_tables', (
    select coalesce(jsonb_agg(to_jsonb(summary)), '[]'::jsonb) from (
      select relname as table_name, n_live_tup as estimated_rows,
        pg_total_relation_size(relid) as table_and_index_bytes,
        seq_scan, seq_tup_read, idx_scan, idx_tup_fetch
      from pg_stat_user_tables where schemaname = 'public'
      order by table_and_index_bytes desc
    ) summary
  ),
  'database_stats_since', (select stats_reset from pg_stat_database where datname = current_database())
) as egress_diagnostics;
