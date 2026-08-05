-- R3: complete application kits and one-click submission handoff.
-- Additive only. No existing profile, resume, job, package, or application is deleted.

do $$
declare
  app_schema text := case
    when to_regclass('career_copilot.application_packages') is not null then 'career_copilot'
    else 'public'
  end;
begin
  execute format($sql$
    alter table %I.application_packages
      add column if not exists content_bundle jsonb not null default '{}'::jsonb,
      add column if not exists tailored_resume jsonb not null default '{}'::jsonb,
      add column if not exists submission_capability jsonb not null default '{}'::jsonb,
      add column if not exists prepared_at timestamptz
  $sql$, app_schema);

  execute format($sql$
    alter table %I.applications
      add column if not exists submission_mode text not null default 'link_handoff',
      add column if not exists handoff_opened_at timestamptz,
      add column if not exists last_submission_action text not null default ''
  $sql$, app_schema);

  execute format('create index if not exists application_packages_prepared_idx on %I.application_packages(user_id, prepared_at desc)', app_schema);
  execute format('create index if not exists applications_submission_mode_idx on %I.applications(user_id, submission_mode, updated_at desc)', app_schema);
end $$;
