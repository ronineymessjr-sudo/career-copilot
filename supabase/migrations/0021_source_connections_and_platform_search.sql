-- R4.0.1: source connection metadata and platform search entries.
-- Additive only. Existing sources, jobs and accounts are preserved.
-- Extends job_sources with the fields the link/JD-import model needs:
--   connection_mode   api (public ATS read) | search (platform portal entry)
--   source_url        canonical company board / platform search URL
--   connection_status never | unknown | ok | failing
--   last_verified_at  when the connection was last checked
--   connection_details free-form jsonb diagnostic info
-- The provider check is widened from automated ATS ids only to every
-- supported platform identifier (greenhouse/lever/ashby/workday/boss/
-- linkedin/shixiseng/nowcoder/zhaopin/job51/liepin).

do $$
declare
  app_schema text := case
    when to_regclass('career_copilot.job_sources') is not null then 'career_copilot'
    when to_regclass('public.job_sources') is not null then 'public'
    else 'public'
  end;
begin
  execute format($sql$
    alter table %I.job_sources
      add column if not exists connection_mode text not null default 'search',
      add column if not exists source_url text not null default '',
      add column if not exists connection_status text not null default 'never',
      add column if not exists last_verified_at timestamptz,
      add column if not exists connection_details jsonb not null default '{}'::jsonb
  $sql$, app_schema);

  execute format('alter table %I.job_sources drop constraint if exists job_sources_connection_mode_check', app_schema);
  execute format($sql$
    alter table %I.job_sources add constraint job_sources_connection_mode_check check (connection_mode in ('api','search'))
  $sql$, app_schema);
  execute format('alter table %I.job_sources drop constraint if exists job_sources_connection_status_check', app_schema);
  execute format($sql$
    alter table %I.job_sources add constraint job_sources_connection_status_check check (connection_status in ('never','unknown','ok','failing'))
  $sql$, app_schema);

  execute format('alter table %I.job_sources drop constraint if exists job_sources_provider_check', app_schema);
  execute format($sql$
    alter table %I.job_sources add constraint job_sources_provider_check check (provider in ('greenhouse','lever','ashby','workday','boss','linkedin','shixiseng','nowcoder','zhaopin','job51','liepin'))
  $sql$, app_schema);

  execute format('create index if not exists job_sources_connection_status_idx on %I.job_sources(connection_status, last_verified_at desc)', app_schema);
  execute format('grant select, insert, update, delete on %I.job_sources to authenticated', app_schema);
end $$;
