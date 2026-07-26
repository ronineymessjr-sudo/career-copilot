set search_path = career_copilot, public, extensions;

-- Milestone 04: authenticated Cloudflare application control plane.
-- This migration preserves the approval-first boundary: approval creates a
-- READY_TO_SUBMIT record, while SUBMITTED requires a separate explicit user action.

alter type career_copilot.application_status
  add value if not exists 'ready_to_submit' before 'submitted';

alter table career_copilot.career_evidence
  add column if not exists verification_status text not null default 'verified',
  add column if not exists evidence_source text not null default 'manual',
  add column if not exists source_ref text,
  add column if not exists active boolean not null default true;

alter table career_copilot.career_evidence
  drop constraint if exists career_evidence_verification_status_check;
alter table career_copilot.career_evidence
  add constraint career_evidence_verification_status_check
  check (verification_status in ('draft','verified','rejected'));

alter table career_copilot.application_packages
  add column if not exists approval_note text not null default '',
  add column if not exists approved_at timestamptz;

create table if not exists career_copilot.application_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references career_copilot.applications(id) on delete cascade,
  from_status text,
  to_status text not null,
  event_type text not null default 'status_change',
  note text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists application_events_user_created_idx
  on career_copilot.application_events(user_id, created_at desc);
create index if not exists application_events_application_created_idx
  on career_copilot.application_events(application_id, created_at desc);
create index if not exists career_evidence_profile_active_idx
  on career_copilot.career_evidence(profile_id, active, verification_status);

alter table career_copilot.application_events enable row level security;

drop policy if exists application_events_owner_all on career_copilot.application_events;
create policy application_events_owner_all
  on career_copilot.application_events
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from career_copilot.applications a
      where a.id = application_events.application_id
        and a.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on career_copilot.application_events to authenticated;
