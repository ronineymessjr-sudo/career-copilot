-- R3.1: onboarding, recommendation feedback and user-controlled recommendation preferences.
-- Additive only. Existing jobs, profiles, resumes and applications remain unchanged.

do $$
declare
  app_schema text := case
    when to_regclass('career_copilot.jobs') is not null then 'career_copilot'
    else 'public'
  end;
begin
  execute format($sql$
    create table if not exists %I.user_job_feedback (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      job_id uuid not null references %I.jobs(id) on delete cascade,
      feedback_type text not null check (feedback_type in ('interested','saved','not_interested','applied_elsewhere')),
      reason text not null default '',
      notes text not null default '',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (user_id, job_id)
    )
  $sql$, app_schema, app_schema);

  execute format($sql$
    create table if not exists %I.recommendation_preferences (
      user_id uuid primary key references auth.users(id) on delete cascade,
      minimum_score integer not null default 60 check (minimum_score between 0 and 100),
      recommendation_limit integer not null default 12 check (recommendation_limit between 1 and 50),
      exploration_ratio integer not null default 15 check (exploration_ratio between 0 and 50),
      only_new_jobs boolean not null default false,
      excluded_companies text[] not null default '{}'::text[],
      excluded_keywords text[] not null default '{}'::text[],
      preferred_groups text[] not null default array['top','new','confirm','explore'],
      updated_at timestamptz not null default now()
    )
  $sql$, app_schema);

  execute format($sql$
    create table if not exists %I.onboarding_progress (
      user_id uuid primary key references auth.users(id) on delete cascade,
      completed_steps jsonb not null default '[]'::jsonb,
      dismissed boolean not null default false,
      completed_at timestamptz,
      updated_at timestamptz not null default now()
    )
  $sql$, app_schema);

  execute format('create index if not exists user_job_feedback_user_type_idx on %I.user_job_feedback(user_id, feedback_type, updated_at desc)', app_schema);
  execute format('create index if not exists user_job_feedback_job_idx on %I.user_job_feedback(job_id, updated_at desc)', app_schema);

  execute format('alter table %I.user_job_feedback enable row level security', app_schema);
  execute format('alter table %I.recommendation_preferences enable row level security', app_schema);
  execute format('alter table %I.onboarding_progress enable row level security', app_schema);

  execute format('drop policy if exists user_job_feedback_owner_all on %I.user_job_feedback', app_schema);
  execute format('create policy user_job_feedback_owner_all on %I.user_job_feedback for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', app_schema);
  execute format('drop policy if exists recommendation_preferences_owner_all on %I.recommendation_preferences', app_schema);
  execute format('create policy recommendation_preferences_owner_all on %I.recommendation_preferences for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', app_schema);
  execute format('drop policy if exists onboarding_progress_owner_all on %I.onboarding_progress', app_schema);
  execute format('create policy onboarding_progress_owner_all on %I.onboarding_progress for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', app_schema);

  execute format('grant select, insert, update, delete on %I.user_job_feedback, %I.recommendation_preferences, %I.onboarding_progress to authenticated', app_schema, app_schema, app_schema);
end $$;
