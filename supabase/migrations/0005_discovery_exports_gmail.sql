set search_path = career_copilot, public, extensions;

-- Milestone 05: real public job-source discovery, export audit, and Gmail draft metadata.
-- Public Greenhouse and Lever GET APIs are ingested by the Cloudflare backend.
-- Gmail integration creates drafts only; it never sends messages.

create table if not exists career_copilot.job_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  provider text not null,
  identifier text not null,
  enabled boolean not null default true,
  filters jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz,
  last_status text not null default 'never',
  last_error text not null default '',
  last_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_sources_provider_check check (provider in ('greenhouse','lever')),
  constraint job_sources_status_check check (last_status in ('never','running','success','partial','failed')),
  unique(user_id, provider, identifier)
);

create table if not exists career_copilot.discovery_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trigger_type text not null default 'manual',
  status text not null default 'running',
  source_count integer not null default 0 check (source_count >= 0),
  jobs_seen integer not null default 0 check (jobs_seen >= 0),
  jobs_imported integer not null default 0 check (jobs_imported >= 0),
  jobs_updated integer not null default 0 check (jobs_updated >= 0),
  jobs_skipped integer not null default 0 check (jobs_skipped >= 0),
  errors jsonb not null default '[]'::jsonb,
  details jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint discovery_runs_trigger_check check (trigger_type in ('manual','cron')),
  constraint discovery_runs_status_check check (status in ('running','success','partial','failed'))
);

create index if not exists job_sources_user_enabled_idx
  on career_copilot.job_sources(user_id, enabled, updated_at desc);
create index if not exists discovery_runs_user_started_idx
  on career_copilot.discovery_runs(user_id, started_at desc);

alter table career_copilot.source_snapshots
  drop constraint if exists source_snapshots_source_url_content_hash_key;
create unique index if not exists source_snapshots_user_url_hash_uidx
  on career_copilot.source_snapshots(user_id, source_url, content_hash);

alter table career_copilot.jobs
  add column if not exists hr_verified_fields jsonb not null default '[]'::jsonb,
  add column if not exists hr_verified_at timestamptz;

alter table career_copilot.application_packages
  add column if not exists gmail_draft_id text,
  add column if not exists gmail_draft_email text,
  add column if not exists gmail_draft_updated_at timestamptz,
  add column if not exists last_exported_at timestamptz,
  add column if not exists export_count integer not null default 0 check (export_count >= 0);

alter table career_copilot.job_sources enable row level security;
alter table career_copilot.discovery_runs enable row level security;

drop policy if exists job_sources_owner_all on career_copilot.job_sources;
create policy job_sources_owner_all
  on career_copilot.job_sources
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists discovery_runs_owner_all on career_copilot.discovery_runs;
create policy discovery_runs_owner_all
  on career_copilot.discovery_runs
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on career_copilot.job_sources, career_copilot.discovery_runs to authenticated;
