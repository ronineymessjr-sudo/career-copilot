-- R4: scalable source catalog, job lifecycle quality, recommendation learning,
-- in-app notifications and analytics facts. Additive and backward compatible.

do $$
declare
  app_schema text := case
    when to_regclass('career_copilot.jobs') is not null then 'career_copilot'
    else 'public'
  end;
begin
  execute format($sql$
    alter table %I.jobs
      add column if not exists job_fingerprint text not null default '',
      add column if not exists lifecycle_state text not null default 'open',
      add column if not exists last_seen_at timestamptz,
      add column if not exists closed_at timestamptz,
      add column if not exists missed_discovery_count integer not null default 0,
      add column if not exists duplicate_of_job_id uuid references %I.jobs(id) on delete set null
  $sql$, app_schema, app_schema);
  execute format('alter table %I.jobs drop constraint if exists jobs_lifecycle_state_check', app_schema);
  execute format('alter table %I.jobs add constraint jobs_lifecycle_state_check check (lifecycle_state in (''open'',''stale'',''closed'',''unknown''))', app_schema);

  execute format($sql$
    alter table %I.job_sources
      add column if not exists consecutive_failures integer not null default 0,
      add column if not exists next_retry_at timestamptz,
      add column if not exists health_score integer not null default 100 check (health_score between 0 and 100)
  $sql$, app_schema);

  execute format($sql$
    create table if not exists %I.source_catalog (
      id uuid primary key default gen_random_uuid(),
      provider text not null check (provider in ('greenhouse','lever','ashby')),
      company_name text not null,
      identifier text not null,
      careers_url text not null default '',
      industry text not null default '',
      locations text[] not null default '{}'::text[],
      verified boolean not null default false,
      enabled boolean not null default true,
      metadata jsonb not null default '{}'::jsonb,
      created_by uuid references auth.users(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (provider, identifier)
    )
  $sql$, app_schema);

  execute format($sql$
    create table if not exists %I.job_lifecycle_checks (
      id uuid primary key default gen_random_uuid(),
      job_id uuid not null references %I.jobs(id) on delete cascade,
      source_id uuid references %I.job_sources(id) on delete set null,
      lifecycle_state text not null,
      reason text not null default '',
      checked_at timestamptz not null default now()
    )
  $sql$, app_schema, app_schema, app_schema);

  execute format($sql$
    create table if not exists %I.recommendation_weight_profiles (
      user_id uuid primary key references auth.users(id) on delete cascade,
      weights jsonb not null default '{"role":30,"skills":25,"experience":20,"location":10,"preference":10,"freshness":5}'::jsonb,
      learned_signals jsonb not null default '{}'::jsonb,
      sample_count integer not null default 0,
      updated_at timestamptz not null default now()
    )
  $sql$, app_schema);

  execute format($sql$
    create table if not exists %I.user_notifications (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      type text not null,
      title text not null,
      body text not null default '',
      action_url text not null default '',
      metadata jsonb not null default '{}'::jsonb,
      read_at timestamptz,
      created_at timestamptz not null default now()
    )
  $sql$, app_schema);

  execute format($sql$
    create table if not exists %I.analytics_daily_facts (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      fact_date date not null,
      metrics jsonb not null default '{}'::jsonb,
      dimensions jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (user_id, fact_date)
    )
  $sql$, app_schema);

  execute format($sql$
    update %I.jobs
       set job_fingerprint = md5(lower(regexp_replace(coalesce(company_name,'') || '|' || coalesce(title,'') || '|' || coalesce(city,'') || '|' || coalesce(source_url,''), '\s+', ' ', 'g'))),
           last_seen_at = coalesce(last_seen_at, updated_at, created_at)
     where job_fingerprint = ''
  $sql$, app_schema);

  execute format('create index if not exists jobs_fingerprint_idx on %I.jobs(job_fingerprint)', app_schema);
  execute format('create index if not exists jobs_lifecycle_idx on %I.jobs(lifecycle_state, last_seen_at desc)', app_schema);
  execute format('create index if not exists job_lifecycle_checks_job_idx on %I.job_lifecycle_checks(job_id, checked_at desc)', app_schema);
  execute format('create index if not exists notifications_unread_idx on %I.user_notifications(user_id, created_at desc) where read_at is null', app_schema);
  execute format('create index if not exists analytics_daily_facts_user_date_idx on %I.analytics_daily_facts(user_id, fact_date desc)', app_schema);

  execute format('alter table %I.source_catalog enable row level security', app_schema);
  execute format('alter table %I.job_lifecycle_checks enable row level security', app_schema);
  execute format('alter table %I.recommendation_weight_profiles enable row level security', app_schema);
  execute format('alter table %I.user_notifications enable row level security', app_schema);
  execute format('alter table %I.analytics_daily_facts enable row level security', app_schema);

  execute format('drop policy if exists source_catalog_authenticated_read on %I.source_catalog', app_schema);
  execute format('create policy source_catalog_authenticated_read on %I.source_catalog for select to authenticated using (enabled = true)', app_schema);
  execute format('drop policy if exists lifecycle_checks_authenticated_read on %I.job_lifecycle_checks', app_schema);
  execute format('create policy lifecycle_checks_authenticated_read on %I.job_lifecycle_checks for select to authenticated using (exists (select 1 from %I.jobs j where j.id = job_id))', app_schema, app_schema);
  execute format('drop policy if exists lifecycle_checks_authenticated_insert on %I.job_lifecycle_checks', app_schema);
  execute format('create policy lifecycle_checks_authenticated_insert on %I.job_lifecycle_checks for insert to authenticated with check (exists (select 1 from %I.jobs j where j.id = job_id and (j.user_id = (select auth.uid()) or j.visibility = ''public'')))', app_schema, app_schema);
  execute format('drop policy if exists recommendation_weight_profiles_owner_all on %I.recommendation_weight_profiles', app_schema);
  execute format('create policy recommendation_weight_profiles_owner_all on %I.recommendation_weight_profiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', app_schema);
  execute format('drop policy if exists user_notifications_owner_all on %I.user_notifications', app_schema);
  execute format('create policy user_notifications_owner_all on %I.user_notifications for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', app_schema);
  execute format('drop policy if exists analytics_daily_facts_owner_read on %I.analytics_daily_facts', app_schema);
  execute format('create policy analytics_daily_facts_owner_read on %I.analytics_daily_facts for select to authenticated using ((select auth.uid()) = user_id)', app_schema);

  execute format('grant select on %I.source_catalog, %I.analytics_daily_facts to authenticated', app_schema, app_schema, app_schema);
  execute format('grant select, insert, update, delete on %I.recommendation_weight_profiles, %I.user_notifications to authenticated', app_schema, app_schema);
end $$;
