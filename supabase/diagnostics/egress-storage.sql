-- Optional: run in Supabase SQL Editor to inspect file sizes.
-- Only SELECTs in a read-only transaction. No files or permissions are changed.
-- Output contains no object paths, account names, URLs, keys or tokens.
begin transaction read only;

with files as (
  select bucket_id,
    coalesce(nullif(metadata ->> 'mimetype', ''), 'unknown') as mime_type,
    case when metadata ->> 'size' ~ '^[0-9]+$'
      then (metadata ->> 'size')::bigint end as size_bytes
  from storage.objects
  where bucket_id in ('academy-media', 'staff-portraits')
)
select bucket_id, mime_type, count(*) as files,
  count(*) filter (where size_bytes is null) as unknown_sizes,
  sum(size_bytes) as total_bytes, max(size_bytes) as largest_file_bytes,
  round(avg(size_bytes)) as average_file_bytes
from files
group by bucket_id, mime_type
order by total_bytes desc nulls last;

-- A stable hash lets repeated measurements identify the same object without
-- publishing its path. Sizes are inventory, not monthly transfer measurements.
select bucket_id, md5(bucket_id || '/' || name) as object_id,
  metadata ->> 'mimetype' as mime_type,
  (metadata ->> 'size')::bigint as size_bytes
from storage.objects
where bucket_id in ('academy-media', 'staff-portraits')
  and metadata ->> 'size' ~ '^[0-9]+$'
order by size_bytes desc
limit 20;

rollback;
