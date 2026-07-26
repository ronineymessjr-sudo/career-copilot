-- Milestone 08: deterministic/grounded career agents, hybrid job ranking,
-- resume personas, MCP tool registry and evaluation evidence.
-- Agents may analyze and draft. They may not submit applications, send messages,
-- accept interviews or accept offers without a separate explicit user action.

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_name text not null,
  task_type text not null,
  status text not null default 'running',
  subject_type text not null default '',
  subject_id uuid,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  confidence numeric(5,4) not null default 0 check (confidence between 0 and 1),
  requires_human boolean not null default false,
  error_message text not null default '',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer not null default 0 check (duration_ms >= 0),
  constraint agent_runs_status_check check (status in ('running','waiting_for_human','completed','failed','cancelled')),
  constraint agent_runs_task_type_check check (task_type in ('rank_jobs','rank_job','generate_resume','evaluate_grounding','daily_report','analyze_job','mcp_tool'))
);

create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  sequence_no integer not null check (sequence_no between 0 and 1000),
  role text not null,
  agent_name text not null,
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint agent_messages_role_check check (role in ('system','user','assistant','tool')),
  unique(run_id, sequence_no)
);

create table if not exists public.agent_traces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  sequence_no integer not null check (sequence_no between 0 and 1000),
  node_name text not null,
  status text not null default 'completed',
  input_summary jsonb not null default '{}'::jsonb,
  output_summary jsonb not null default '{}'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer not null default 0 check (duration_ms >= 0),
  constraint agent_traces_status_check check (status in ('running','completed','failed','skipped')),
  unique(run_id, sequence_no)
);

create table if not exists public.job_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  run_id uuid references public.agent_runs(id) on delete set null,
  rule_score integer not null check (rule_score between 0 and 100),
  semantic_score integer not null check (semantic_score between 0 and 100),
  history_score integer not null check (history_score between 0 and 100),
  final_score integer not null check (final_score between 0 and 100),
  grade text not null,
  eligible boolean not null default false,
  reasoning jsonb not null default '[]'::jsonb,
  citations jsonb not null default '[]'::jsonb,
  missing_skills jsonb not null default '[]'::jsonb,
  model_version text not null default 'hybrid-v1',
  scored_at timestamptz not null default now(),
  constraint job_scores_grade_check check (grade in ('S','A','B','C')),
  unique(user_id, job_id)
);

alter table public.resume_versions
  add column if not exists persona text not null default 'agent_engineer',
  add column if not exists version_no integer not null default 1,
  add column if not exists status text not null default 'draft',
  add column if not exists target_job_id uuid references public.jobs(id) on delete set null,
  add column if not exists source_agent_run_id uuid references public.agent_runs(id) on delete set null,
  add column if not exists evidence_refs jsonb not null default '[]'::jsonb,
  add column if not exists alignment_summary jsonb not null default '{}'::jsonb;

alter table public.resume_versions drop constraint if exists resume_versions_persona_check;
alter table public.resume_versions add constraint resume_versions_persona_check
  check (persona in ('agent_engineer','ai_product','ai_solution'));
alter table public.resume_versions drop constraint if exists resume_versions_status_check;
alter table public.resume_versions add constraint resume_versions_status_check
  check (status in ('draft','approved','archived'));
alter table public.resume_versions drop constraint if exists resume_versions_version_no_check;
alter table public.resume_versions add constraint resume_versions_version_no_check
  check (version_no between 1 and 10000);

-- Existing resume rows predate persona/version columns. Backfill deterministic
-- version numbers before adding the uniqueness guarantee.
with numbered as (
  select id, row_number() over (partition by profile_id, persona order by created_at, id) as next_version
  from public.resume_versions
)
update public.resume_versions r
set version_no = numbered.next_version
from numbered
where numbered.id = r.id;

create table if not exists public.resume_alignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_version_id uuid not null references public.resume_versions(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  alignment_score integer not null check (alignment_score between 0 and 100),
  matched_keywords jsonb not null default '[]'::jsonb,
  missing_keywords jsonb not null default '[]'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  explanation jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, resume_version_id, job_id)
);

create table if not exists public.evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid references public.agent_runs(id) on delete set null,
  evaluation_type text not null,
  status text not null default 'passed',
  dataset_version text not null default 'm08-v1',
  metrics jsonb not null default '{}'::jsonb,
  failures jsonb not null default '[]'::jsonb,
  sample_count integer not null default 0 check (sample_count >= 0),
  created_at timestamptz not null default now(),
  constraint evaluation_runs_type_check check (evaluation_type in ('rag','agent_grounding','ranking','resume')),
  constraint evaluation_runs_status_check check (status in ('passed','failed','warning'))
);

create table if not exists public.mcp_tool_registry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null,
  input_schema jsonb not null default '{}'::jsonb,
  access_mode text not null default 'read',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mcp_tool_registry_access_check check (access_mode in ('read','draft','approval_required')),
  unique(user_id, name)
);

create table if not exists public.daily_agent_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_date date not null,
  run_id uuid references public.agent_runs(id) on delete set null,
  summary jsonb not null default '{}'::jsonb,
  ranked_job_ids jsonb not null default '[]'::jsonb,
  skill_gaps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, report_date)
);

create index if not exists agent_runs_user_started_idx on public.agent_runs(user_id, started_at desc);
create index if not exists agent_messages_run_sequence_idx on public.agent_messages(run_id, sequence_no);
create index if not exists agent_traces_run_sequence_idx on public.agent_traces(run_id, sequence_no);
create index if not exists job_scores_user_score_idx on public.job_scores(user_id, final_score desc, scored_at desc);
create unique index if not exists resume_versions_profile_persona_version_uidx on public.resume_versions(profile_id, persona, version_no);
create index if not exists resume_alignments_user_job_idx on public.resume_alignments(user_id, job_id, alignment_score desc);
create index if not exists evaluation_runs_user_created_idx on public.evaluation_runs(user_id, created_at desc);
create index if not exists daily_agent_reports_user_date_idx on public.daily_agent_reports(user_id, report_date desc);

alter table public.agent_runs enable row level security;
alter table public.agent_messages enable row level security;
alter table public.agent_traces enable row level security;
alter table public.job_scores enable row level security;
alter table public.resume_alignments enable row level security;
alter table public.evaluation_runs enable row level security;
alter table public.mcp_tool_registry enable row level security;
alter table public.daily_agent_reports enable row level security;

drop policy if exists agent_runs_owner_all on public.agent_runs;
drop policy if exists agent_messages_owner_all on public.agent_messages;
drop policy if exists agent_traces_owner_all on public.agent_traces;
drop policy if exists job_scores_owner_all on public.job_scores;
drop policy if exists resume_alignments_owner_all on public.resume_alignments;
drop policy if exists evaluation_runs_owner_all on public.evaluation_runs;
drop policy if exists mcp_tool_registry_owner_all on public.mcp_tool_registry;
drop policy if exists daily_agent_reports_owner_all on public.daily_agent_reports;

create policy agent_runs_owner_all on public.agent_runs for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy agent_messages_owner_all on public.agent_messages for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.agent_runs r where r.id = agent_messages.run_id and r.user_id = (select auth.uid()))
  );
create policy agent_traces_owner_all on public.agent_traces for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.agent_runs r where r.id = agent_traces.run_id and r.user_id = (select auth.uid()))
  );
create policy job_scores_owner_all on public.job_scores for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.jobs j where j.id = job_scores.job_id and j.user_id = (select auth.uid()))
  );
create policy resume_alignments_owner_all on public.resume_alignments for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.resume_versions r
      join public.profiles p on p.id = r.profile_id
      where r.id = resume_alignments.resume_version_id and p.user_id = (select auth.uid())
    )
    and exists (select 1 from public.jobs j where j.id = resume_alignments.job_id and j.user_id = (select auth.uid()))
  );
create policy evaluation_runs_owner_all on public.evaluation_runs for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy mcp_tool_registry_owner_all on public.mcp_tool_registry for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy daily_agent_reports_owner_all on public.daily_agent_reports for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on
  public.agent_runs,
  public.agent_messages,
  public.agent_traces,
  public.job_scores,
  public.resume_alignments,
  public.evaluation_runs,
  public.mcp_tool_registry,
  public.daily_agent_reports
  to authenticated;
