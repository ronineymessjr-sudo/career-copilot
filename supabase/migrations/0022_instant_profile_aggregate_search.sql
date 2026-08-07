-- R4.0.2: on-demand profile-driven multi-platform search runs and result tracking.
-- Additive only. Existing jobs, sources, profiles, resumes and applications are preserved.

do $$
declare
  app_schema text := case
    when to_regclass('career_copilot.jobs') is not null then 'career_copilot'
    else 'public'
  end;
begin
  execute format($sql$
    create table if not exists %I.profile_search_runs (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      status text not null default 'running',
      query_text text not null default '',
      query_snapshot jsonb not null default '{}'::jsonb,
      requested_platforms text[] not null default '{}'::text[],
      platform_statuses jsonb not null default '[]'::jsonb,
      jobs_found integer not null default 0,
      jobs_imported integer not null default 0,
      jobs_prepared integer not null default 0,
      started_at timestamptz not null default now(),
      completed_at timestamptz,
      updated_at timestamptz not null default now(),
      constraint profile_search_runs_status_check check (status in ('running','completed','partial','failed'))
    )
  $sql$, app_schema);

  execute format($sql$
    create table if not exists %I.profile_search_results (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      search_run_id uuid not null references %I.profile_search_runs(id) on delete cascade,
      job_id uuid not null references %I.jobs(id) on delete cascade,
      source_platform text not null default 'unknown',
      rank integer not null default 0,
      recommendation_score integer not null default 0,
      eligible boolean not null default false,
      needs_confirmation boolean not null default false,
      preparation_status text not null default 'discovered',
      application_id uuid references %I.applications(id) on delete set null,
      result_snapshot jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      unique (search_run_id, job_id)
    )
  $sql$, app_schema, app_schema, app_schema, app_schema);

  execute format('create index if not exists profile_search_runs_user_started_idx on %I.profile_search_runs(user_id, started_at desc)', app_schema);
  execute format('create index if not exists profile_search_results_run_rank_idx on %I.profile_search_results(search_run_id, rank asc)', app_schema);
  execute format('create index if not exists profile_search_results_user_score_idx on %I.profile_search_results(user_id, recommendation_score desc)', app_schema);

  execute format('alter table %I.profile_search_runs enable row level security', app_schema);
  execute format('alter table %I.profile_search_results enable row level security', app_schema);

  execute format('drop policy if exists profile_search_runs_owner_all on %I.profile_search_runs', app_schema);
  execute format('create policy profile_search_runs_owner_all on %I.profile_search_runs for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', app_schema);
  execute format('drop policy if exists profile_search_results_owner_all on %I.profile_search_results', app_schema);
  execute format('create policy profile_search_results_owner_all on %I.profile_search_results for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', app_schema);

  execute format('grant select, insert, update, delete on %I.profile_search_runs, %I.profile_search_results to authenticated', app_schema, app_schema);
end $$;
