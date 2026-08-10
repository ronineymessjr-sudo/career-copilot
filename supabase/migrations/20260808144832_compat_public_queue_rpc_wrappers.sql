-- Reproduce the historical remote migration so local and remote migration
-- histories stay aligned. The public functions are compatibility wrappers;
-- Career Copilot data remains in the isolated career_copilot schema.

create or replace function public.claim_queue_job(p_job_id uuid)
returns career_copilot.queue_jobs
language sql
set search_path = public, pg_catalog
as $$
  select career_copilot.claim_queue_job(p_job_id);
$$;

create or replace function public.complete_queue_job(p_job_id uuid, p_result jsonb)
returns void
language sql
set search_path = public, pg_catalog
as $$
  select career_copilot.complete_queue_job(p_job_id, p_result);
$$;

create or replace function public.fail_queue_job(p_job_id uuid, p_error_message text)
returns void
language sql
set search_path = public, pg_catalog
as $$
  select career_copilot.fail_queue_job(p_job_id, p_error_message);
$$;
