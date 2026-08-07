-- Migration 0025: Async Queue for long-running jobs (search, resume generation, etc.)
-- Supports dual-path consumption: fast-path (user poll) + slow-path (scheduler cron)

create table if not exists career_copilot.queue_jobs (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references career_copilot.profiles(user_id) on delete cascade,
  job_type    text not null check (job_type in ('search', 'resume_generation', 'evaluation', 'dispatch')),
  payload     jsonb not null default '{}'::jsonb,
  status      text not null default 'pending' check (status in ('pending', 'claimed', 'processing', 'completed', 'failed')),
  created_at  timestamptz not null default now(),
  claimed_at  timestamptz,
  started_at  timestamptz,
  completed_at timestamptz,
  attempts    integer not null default 0,
  max_attempts integer not null default 3,
  error_message text,
  result_id   bigint
);

create index if not exists queue_jobs_status_idx on career_copilot.queue_jobs (status, created_at);
create index if not exists queue_jobs_user_idx on career_copilot.queue_jobs (user_id, created_at desc);

create table if not exists career_copilot.queue_results (
  id          bigint generated always as identity primary key,
  job_id      bigint not null references career_copilot.queue_jobs(id) on delete cascade,
  user_id     uuid not null references career_copilot.profiles(user_id) on delete cascade,
  result_type text not null default 'json' check (result_type in ('json', 'error', 'partial')),
  result_data jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists queue_results_job_idx on career_copilot.queue_results (job_id);
create index if not exists queue_results_user_idx on career_copilot.queue_results (user_id, created_at desc);

-- RPC: fetch the next pending job (oldest first), returns null if none available
create or replace function career_copilot.fetch_next_pending(p_max_attempts integer default 3)
returns table (
  id bigint,
  user_id uuid,
  job_type text,
  payload jsonb,
  attempts integer,
  created_at timestamptz
) language sql security definer as $$
  select id, user_id, job_type, payload, attempts, created_at
  from career_copilot.queue_jobs
  where status = 'pending' and attempts < p_max_attempts
  order by created_at asc
  limit 1;
$$;

-- RPC: atomically claim a job (pending -> claimed), returns the claimed row or null
create or replace function career_copilot.claim_queue_job(p_job_id bigint)
returns table (
  id bigint,
  user_id uuid,
  job_type text,
  payload jsonb,
  attempts integer
) language sql security definer as $$
  update career_copilot.queue_jobs
  set status = 'claimed', claimed_at = now(), attempts = attempts + 1
  where id = p_job_id and status = 'pending'
  returning id, user_id, job_type, payload, attempts;
$$;

-- RPC: mark job as completed and insert result in a single transaction
create or replace function career_copilot.complete_queue_job(
  p_job_id bigint,
  p_result_data jsonb,
  p_result_type text default 'json'
) returns void language plpgsql security definer as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id from career_copilot.queue_jobs where id = p_job_id;
  if not found then
    raise exception 'job % not found', p_job_id;
  end if;

  insert into career_copilot.queue_results (job_id, user_id, result_type, result_data)
  values (p_job_id, v_user_id, p_result_type, p_result_data);

  update career_copilot.queue_jobs
  set status = 'completed', completed_at = now(),
      result_id = (select id from career_copilot.queue_results where job_id = p_job_id order by created_at desc limit 1)
  where id = p_job_id;
end;
$$;

-- RPC: mark job as failed with error message
create or replace function career_copilot.fail_queue_job(
  p_job_id bigint,
  p_error_message text
) returns void language sql security definer as $$
  update career_copilot.queue_jobs
  set status = 'failed', completed_at = now(), error_message = p_error_message
  where id = p_job_id;
$$;

-- RPC: recover stale jobs (claimed/processing for > 10 minutes) back to pending
create or replace function career_copilot.recover_stale_jobs(
  p_stale_minutes integer default 10
) returns setof bigint language sql security definer as $$
  update career_copilot.queue_jobs
  set status = 'pending', claimed_at = null, started_at = null
  where status in ('claimed', 'processing')
    and claimed_at is not null
    and claimed_at < now() - make_interval(mins => p_stale_minutes)
    and attempts < max_attempts
  returning id;
$$;

-- RLS: owner can read/write their own rows; service_role has full access (via migration 0013)

alter table career_copilot.queue_jobs enable row level security;
alter table career_copilot.queue_results enable row level security;

drop policy if exists queue_jobs_owner_all on career_copilot.queue_jobs;
create policy queue_jobs_owner_all on career_copilot.queue_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists queue_results_owner_all on career_copilot.queue_results;
create policy queue_results_owner_all on career_copilot.queue_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
