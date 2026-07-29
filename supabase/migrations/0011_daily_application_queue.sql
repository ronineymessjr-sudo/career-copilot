set search_path = career_copilot, public, extensions;

-- A daily batch is an internal handoff queue. It never stores a recruiting
-- platform password, cookie, or an instruction to submit on the user's behalf.
create table if not exists career_copilot.daily_application_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  daily_limit integer not null default 5 check (daily_limit between 1 and 20),
  minimum_score integer not null default 75 check (minimum_score between 0 and 100),
  allowed_channels text[] not null default array['boss','linkedin','bonjour','greenhouse','lever','company_form','email'],
  allowed_workplaces career_copilot.job_workplace[] not null default array['remote','hybrid','onsite']::career_copilot.job_workplace[],
  require_batch_approval boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists career_copilot.application_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_date date not null,
  status text not null default 'queued' check (status in ('queued','handoff_ready','completed','cancelled')),
  selection_summary jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, batch_date)
);

create table if not exists career_copilot.application_dispatches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid not null references career_copilot.application_batches(id) on delete cascade,
  application_id uuid not null unique references career_copilot.applications(id) on delete cascade,
  channel text not null,
  target_url text not null,
  payload_snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','handoff_ready','submitted','failed','cancelled')),
  approved_at timestamptz,
  submitted_at timestamptz,
  external_reference text not null default '',
  failure_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists application_batches_user_date_idx
  on career_copilot.application_batches(user_id, batch_date desc);
create index if not exists application_dispatches_user_status_idx
  on career_copilot.application_dispatches(user_id, status, created_at desc);
create index if not exists application_dispatches_batch_idx
  on career_copilot.application_dispatches(batch_id, status);

alter table career_copilot.daily_application_policies enable row level security;
alter table career_copilot.application_batches enable row level security;
alter table career_copilot.application_dispatches enable row level security;

drop policy if exists daily_application_policies_owner_all on career_copilot.daily_application_policies;
create policy daily_application_policies_owner_all on career_copilot.daily_application_policies for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists application_batches_owner_all on career_copilot.application_batches;
create policy application_batches_owner_all on career_copilot.application_batches for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists application_dispatches_owner_all on career_copilot.application_dispatches;
create policy application_dispatches_owner_all on career_copilot.application_dispatches for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from career_copilot.application_batches b
      where b.id = application_dispatches.batch_id
        and b.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on career_copilot.daily_application_policies,
  career_copilot.application_batches, career_copilot.application_dispatches to authenticated;
