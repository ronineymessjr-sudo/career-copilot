-- R3.2: editable application material versions and complete application tracking.
-- Additive only. Existing packages and application rows remain valid.

do $$
declare
  app_schema text := case
    when to_regclass('career_copilot.applications') is not null then 'career_copilot'
    else 'public'
  end;
begin
  execute format($sql$
    alter table %I.application_packages
      add column if not exists content_revision integer not null default 1,
      add column if not exists last_edited_at timestamptz,
      add column if not exists final_content_snapshot jsonb not null default '{}'::jsonb
  $sql$, app_schema);

  execute format($sql$
    alter table %I.applications
      add column if not exists original_job_snapshot jsonb not null default '{}'::jsonb,
      add column if not exists final_submission_snapshot jsonb not null default '{}'::jsonb,
      add column if not exists last_status_reason text not null default '',
      add column if not exists follow_up_note text not null default ''
  $sql$, app_schema);

  execute format($sql$
    create table if not exists %I.application_material_versions (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      application_id uuid not null references %I.applications(id) on delete cascade,
      package_id uuid references %I.application_packages(id) on delete set null,
      revision integer not null,
      content_bundle jsonb not null default '{}'::jsonb,
      tailored_resume jsonb not null default '{}'::jsonb,
      change_summary jsonb not null default '{}'::jsonb,
      source text not null default 'generated' check (source in ('generated','user_edit','regenerated','submitted_snapshot')),
      created_at timestamptz not null default now(),
      unique (application_id, revision)
    )
  $sql$, app_schema, app_schema, app_schema);

  execute format($sql$
    create table if not exists %I.application_status_events (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      application_id uuid not null references %I.applications(id) on delete cascade,
      from_status text not null default '',
      to_status text not null,
      reason text not null default '',
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  $sql$, app_schema, app_schema);

  execute format('create index if not exists material_versions_application_idx on %I.application_material_versions(application_id, revision desc)', app_schema);
  execute format('create index if not exists application_status_events_timeline_idx on %I.application_status_events(application_id, created_at desc)', app_schema);
  execute format('create index if not exists applications_follow_up_idx on %I.applications(user_id, next_follow_up_at) where next_follow_up_at is not null', app_schema);

  execute format('alter table %I.application_material_versions enable row level security', app_schema);
  execute format('alter table %I.application_status_events enable row level security', app_schema);
  execute format('drop policy if exists material_versions_owner_all on %I.application_material_versions', app_schema);
  execute format('create policy material_versions_owner_all on %I.application_material_versions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', app_schema);
  execute format('drop policy if exists application_status_events_owner_all on %I.application_status_events', app_schema);
  execute format('create policy application_status_events_owner_all on %I.application_status_events for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', app_schema);
  execute format('grant select, insert, update, delete on %I.application_material_versions, %I.application_status_events to authenticated', app_schema, app_schema);

  execute format($sql$
    insert into %I.application_material_versions (user_id, application_id, package_id, revision, content_bundle, tailored_resume, change_summary, source)
    select a.user_id, a.id, p.id, 1, coalesce(p.content_bundle, '{}'::jsonb), coalesce(p.tailored_resume, '{}'::jsonb), '{"initial":true}'::jsonb, 'generated'
      from %I.applications a
      join %I.application_packages p on p.id = a.package_id and p.user_id = a.user_id
     where not exists (select 1 from %I.application_material_versions v where v.application_id = a.id)
  $sql$, app_schema, app_schema, app_schema, app_schema);
end $$;
