-- Reuse the production queue's scheduled_for field for bounded retry backoff.
-- The active schema uses UUID job IDs and retry_count/max_retries; its existing
-- pending-job index already covers this scheduling path.

create or replace function career_copilot.fetch_next_pending(p_max_attempts integer default 3)
returns table (
  id uuid,
  user_id uuid,
  job_type text,
  payload jsonb,
  retry_count integer,
  created_at timestamptz,
  status text
) language sql security definer set search_path = '' as $$
  select q.id, q.user_id, q.job_type, q.payload, q.retry_count, q.created_at, q.status
  from career_copilot.queue_jobs as q
  where q.status = 'pending'
    and q.retry_count < least(p_max_attempts, q.max_retries)
    and q.scheduled_for <= now()
  order by q.scheduled_for asc, q.created_at asc
  limit 1;
$$;

create or replace function career_copilot.claim_queue_job(p_job_id uuid)
returns table (
  id uuid,
  user_id uuid,
  job_type text,
  payload jsonb,
  retry_count integer,
  status text
) language sql security definer set search_path = '' as $$
  update career_copilot.queue_jobs as q
  set status = 'processing',
      retry_count = q.retry_count + 1,
      started_at = now(),
      updated_at = now()
  where q.id = p_job_id
    and q.status = 'pending'
    and q.scheduled_for <= now()
    and q.retry_count < q.max_retries
  returning q.id, q.user_id, q.job_type, q.payload, q.retry_count, q.status;
$$;

create or replace function career_copilot.complete_queue_job(
  p_job_id uuid,
  p_result_data jsonb,
  p_result_type text default 'json'
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
begin
  select q.user_id into v_user_id
  from career_copilot.queue_jobs as q
  where q.id = p_job_id;
  if not found then
    raise exception 'queue job % not found', p_job_id;
  end if;

  insert into career_copilot.queue_results (queue_job_id, user_id, result_type, status, data, completed_at)
  values (p_job_id, v_user_id, p_result_type, 'completed', p_result_data, now());

  update career_copilot.queue_jobs as q
  set status = 'completed',
      result = p_result_data,
      completed_at = now(),
      error_message = null,
      started_at = null,
      updated_at = now()
  where q.id = p_job_id;
end;
$$;

create or replace function career_copilot.fail_queue_job(
  p_job_id uuid,
  p_error_message text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  update career_copilot.queue_jobs as q
  set status = case when q.retry_count < q.max_retries then 'pending' else 'failed' end,
      scheduled_for = case
        when q.retry_count < q.max_retries then now() + make_interval(secs => least(3600, 30 * power(2, greatest(q.retry_count - 1, 0))::integer))
        else q.scheduled_for
      end,
      completed_at = case when q.retry_count < q.max_retries then null else now() end,
      started_at = null,
      error_message = left(coalesce(p_error_message, 'Queue job failed'), 2000),
      updated_at = now()
  where q.id = p_job_id;

  if not found then
    raise exception 'queue job % not found', p_job_id;
  end if;
end;
$$;

create or replace function career_copilot.recover_stale_jobs(
  p_stale_minutes integer default 10
) returns setof uuid language plpgsql security definer set search_path = '' as $$
begin
  return query
  update career_copilot.queue_jobs as q
  set status = case when q.retry_count < q.max_retries then 'pending' else 'failed' end,
      scheduled_for = case
        when q.retry_count < q.max_retries then now() + make_interval(secs => least(3600, 30 * power(2, greatest(q.retry_count - 1, 0))::integer))
        else q.scheduled_for
      end,
      completed_at = case when q.retry_count < q.max_retries then null else now() end,
      started_at = null,
      error_message = case
        when q.retry_count >= q.max_retries then coalesce(q.error_message, 'Queue job exhausted retries after a stale claim')
        else q.error_message
      end,
      updated_at = now()
  where q.status = 'processing'
    and q.started_at is not null
    and q.started_at < now() - make_interval(mins => greatest(p_stale_minutes, 1))
  returning q.id;
end;
$$;
