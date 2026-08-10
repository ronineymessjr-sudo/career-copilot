-- Career Copilot schema repair for databases that already recorded the
-- historical M01-M08 migrations before schema isolation was introduced.
-- This migration is safe to replay: it moves only known Career Copilot
-- objects when the isolated copy does not already exist.
create schema if not exists career_copilot;

do $$
declare
  item text;
begin
  foreach item in array array[
    'profiles','companies','jobs','job_evaluations','career_evidence',
    'resume_versions','application_packages','applications','interviews',
    'offers','source_snapshots','model_runs','delivery_runs',
    'model_benchmark_runs','application_events','job_sources','discovery_runs',
    'interview_feedback','skill_gaps','weekly_reviews','operational_events',
    'career_documents','career_chunks','workflow_threads',
    'workflow_checkpoints','langgraph_checkpoints','langgraph_writes',
    'agent_runs','agent_messages','agent_traces','job_scores',
    'resume_alignments','evaluation_runs','mcp_tool_registry',
    'daily_agent_reports'
  ] loop
    if to_regclass(format('career_copilot.%I', item)) is null
       and to_regclass(format('public.%I', item)) is not null then
      execute format('alter table public.%I set schema career_copilot', item);
    end if;
  end loop;
end
$$;

do $$
declare
  item text;
begin
  foreach item in array array['job_workplace','company_tier','application_status','approval_status'] loop
    if to_regtype(format('career_copilot.%I', item)) is null
       and to_regtype(format('public.%I', item)) is not null then
      execute format('alter type public.%I set schema career_copilot', item);
    end if;
  end loop;
end
$$;

grant usage on schema career_copilot to anon, authenticated, service_role;

do $$
declare
  missing text[] := array[]::text[];
  item text;
begin
  foreach item in array array['profiles','jobs','applications','career_evidence','resume_versions','agent_runs'] loop
    if to_regclass(format('career_copilot.%I', item)) is null then
      missing := array_append(missing, item);
    end if;
  end loop;
  if cardinality(missing) > 0 then
    raise exception 'Career Copilot schema is incomplete; missing tables: %', array_to_string(missing, ', ');
  end if;
end
$$;

