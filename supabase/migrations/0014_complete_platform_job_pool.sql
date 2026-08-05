-- Complete multi-user platform job pool and per-user job verification.
-- Safe for the existing production project: no table is dropped and no job is deleted.
-- The migration supports either the historical public schema or the deployed
-- career_copilot schema.

do $$
declare
  jobs_schema text := case
    when to_regclass('career_copilot.jobs') is not null then 'career_copilot'
    else 'public'
  end;
  sources_schema text := case
    when to_regclass('public.job_sources') is not null then 'public'
    when to_regclass('career_copilot.job_sources') is not null then 'career_copilot'
    else null
  end;
begin
  execute format('alter table %I.profiles alter column graduation_year set default (extract(year from current_date)::integer + 1)', jobs_schema);
  execute format($sql$alter table %I.profiles alter column major set default ''$sql$, jobs_schema);
  execute format($sql$alter table %I.profiles alter column degree set default ''$sql$, jobs_schema);
  execute format($sql$alter table %I.profiles alter column preferences set default '{"target_roles":[],"locations":[],"work_modes":[],"industries":[],"keywords":[],"excluded_keywords":[],"internship_only":false}'::jsonb$sql$, jobs_schema);


  -- Remove historical one-row-per-job constraints. Shared jobs need one
  -- evaluation, package and application per user, not one globally.
  execute format('alter table %I.job_evaluations drop constraint if exists job_evaluations_job_id_key', jobs_schema);
  execute format('alter table %I.application_packages drop constraint if exists application_packages_job_id_key', jobs_schema);
  execute format('alter table %I.applications drop constraint if exists applications_job_id_key', jobs_schema);
  execute format('alter table %I.source_snapshots drop constraint if exists source_snapshots_source_url_content_hash_key', jobs_schema);
  execute format('create unique index if not exists evaluations_user_job_uidx on %I.job_evaluations(user_id, job_id)', jobs_schema);
  execute format('create unique index if not exists packages_user_job_uidx on %I.application_packages(user_id, job_id)', jobs_schema);
  execute format('create unique index if not exists applications_user_job_uidx on %I.applications(user_id, job_id)', jobs_schema);
  execute format('create unique index if not exists source_snapshots_user_url_hash_uidx on %I.source_snapshots(user_id, source_url, content_hash)', jobs_schema);

  execute format('alter table %I.jobs add column if not exists visibility text not null default ''private''', jobs_schema);
  execute format('alter table %I.jobs drop constraint if exists jobs_visibility_check', jobs_schema);
  execute format('alter table %I.jobs add constraint jobs_visibility_check check (visibility in (''private'',''public''))', jobs_schema);

  -- Existing automatically discovered ATS rows are public listings and become
  -- visible in the common pool. Manually imported rows remain private by default.
  execute format($sql$
    update %I.jobs
       set visibility = 'public'
     where visibility = 'private'
       and (
         coalesce(source_name, '') ~* '^(greenhouse|lever|ashby):'
         or coalesce(raw_payload->>'provider', '') in ('greenhouse','lever','ashby')
       )
  $sql$, jobs_schema);

  execute format($sql$
    create table if not exists %I.job_user_overrides (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      job_id uuid not null references %I.jobs(id) on delete cascade,
      accepts_students boolean,
      accepts_2028 boolean,
      days_per_week integer,
      minimum_months integer,
      graduation_requirement text,
      workplace %I.job_workplace,
      city text,
      district text,
      address text,
      salary text,
      deadline date,
      verified_fields text[] not null default array[]::text[],
      note text not null default '',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (user_id, job_id)
    )
  $sql$, jobs_schema, jobs_schema, jobs_schema);
  execute format('create index if not exists job_user_overrides_user_updated_idx on %I.job_user_overrides(user_id, updated_at desc)', jobs_schema);
  execute format('create index if not exists jobs_visibility_updated_idx on %I.jobs(visibility, updated_at desc)', jobs_schema);

  execute format('alter table %I.job_user_overrides enable row level security', jobs_schema);
  execute format('drop policy if exists job_user_overrides_owner_all on %I.job_user_overrides', jobs_schema);
  execute format($sql$
    create policy job_user_overrides_owner_all on %I.job_user_overrides
      for all to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id)
  $sql$, jobs_schema);

  -- Public listings are readable by every authenticated account. Writes remain
  -- owner-scoped; other users store factual confirmations in job_user_overrides.
  execute format('drop policy if exists jobs_owner_all on %I.jobs', jobs_schema);
  execute format('drop policy if exists jobs_pool_select on %I.jobs', jobs_schema);
  execute format('drop policy if exists jobs_owner_insert on %I.jobs', jobs_schema);
  execute format('drop policy if exists jobs_owner_update on %I.jobs', jobs_schema);
  execute format('drop policy if exists jobs_owner_delete on %I.jobs', jobs_schema);
  execute format($sql$
    create policy jobs_pool_select on %I.jobs for select to authenticated
      using ((select auth.uid()) = user_id or visibility = 'public')
  $sql$, jobs_schema);
  execute format($sql$
    create policy jobs_owner_insert on %I.jobs for insert to authenticated
      with check ((select auth.uid()) = user_id)
  $sql$, jobs_schema);
  execute format($sql$
    create policy jobs_owner_update on %I.jobs for update to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id)
  $sql$, jobs_schema);
  execute format($sql$
    create policy jobs_owner_delete on %I.jobs for delete to authenticated
      using ((select auth.uid()) = user_id)
  $sql$, jobs_schema);
  execute format('grant select, insert, update, delete on %I.job_user_overrides to authenticated', jobs_schema);

  if sources_schema is not null then
    execute format('alter table %I.job_sources add column if not exists scope text not null default ''private''', sources_schema);
    execute format('alter table %I.job_sources drop constraint if exists job_sources_scope_check', sources_schema);
    execute format('alter table %I.job_sources add constraint job_sources_scope_check check (scope in (''private'',''shared''))', sources_schema);
    execute format('alter table %I.job_sources drop constraint if exists job_sources_provider_check', sources_schema);
    execute format('alter table %I.job_sources add constraint job_sources_provider_check check (provider in (''greenhouse'',''lever'',''ashby''))', sources_schema);

    -- Existing sources stay private. Platform operators explicitly mark only
    -- public company ATS sources as shared, preventing accidental disclosure.

    execute format('drop policy if exists job_sources_owner_all on %I.job_sources', sources_schema);
    execute format('drop policy if exists job_sources_pool_select on %I.job_sources', sources_schema);
    execute format('drop policy if exists job_sources_owner_insert on %I.job_sources', sources_schema);
    execute format('drop policy if exists job_sources_owner_update on %I.job_sources', sources_schema);
    execute format('drop policy if exists job_sources_owner_delete on %I.job_sources', sources_schema);
    execute format($sql$
      create policy job_sources_pool_select on %I.job_sources for select to authenticated
        using ((select auth.uid()) = user_id or scope = 'shared')
    $sql$, sources_schema);
    execute format($sql$
      create policy job_sources_owner_insert on %I.job_sources for insert to authenticated
        with check ((select auth.uid()) = user_id)
    $sql$, sources_schema);
    execute format($sql$
      create policy job_sources_owner_update on %I.job_sources for update to authenticated
        using ((select auth.uid()) = user_id)
        with check ((select auth.uid()) = user_id)
    $sql$, sources_schema);
    execute format($sql$
      create policy job_sources_owner_delete on %I.job_sources for delete to authenticated
        using ((select auth.uid()) = user_id)
    $sql$, sources_schema);
    execute format('create index if not exists job_sources_scope_enabled_idx on %I.job_sources(scope, enabled, updated_at desc)', sources_schema);
  end if;
end $$;
