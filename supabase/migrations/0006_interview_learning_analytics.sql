set search_path = career_copilot, public, extensions;

-- Milestone 06: interview preparation, feedback learning, weekly reviews and operational observability.
-- All tables are user-owned and protected by RLS. No interview invitation or offer action is accepted automatically.

alter table career_copilot.interviews
  add column if not exists status text not null default 'scheduled',
  add column if not exists interview_type text not null default 'mixed',
  add column if not exists duration_minutes integer,
  add column if not exists preparation_status text not null default 'not_started',
  add column if not exists readiness_score integer not null default 0,
  add column if not exists preparation_plan jsonb not null default '{}'::jsonb,
  add column if not exists feedback_summary jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table career_copilot.interviews drop constraint if exists interviews_status_check;
alter table career_copilot.interviews add constraint interviews_status_check
  check (status in ('scheduled','completed','cancelled','no_show'));
alter table career_copilot.interviews drop constraint if exists interviews_type_check;
alter table career_copilot.interviews add constraint interviews_type_check
  check (interview_type in ('hr','technical','product','case','behavioral','mixed'));
alter table career_copilot.interviews drop constraint if exists interviews_preparation_status_check;
alter table career_copilot.interviews add constraint interviews_preparation_status_check
  check (preparation_status in ('not_started','in_progress','ready','needs_review'));
alter table career_copilot.interviews drop constraint if exists interviews_readiness_score_check;
alter table career_copilot.interviews add constraint interviews_readiness_score_check
  check (readiness_score between 0 and 100);
alter table career_copilot.interviews drop constraint if exists interviews_duration_minutes_check;
alter table career_copilot.interviews add constraint interviews_duration_minutes_check
  check (duration_minutes is null or duration_minutes between 5 and 480);

create table if not exists career_copilot.interview_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_id uuid not null references career_copilot.interviews(id) on delete cascade,
  sequence_no integer not null default 1 check (sequence_no between 1 and 100),
  question text not null,
  category text not null default 'other',
  self_rating integer not null default 3 check (self_rating between 1 and 5),
  result text not null default 'mixed',
  notes text not null default '',
  evidence_refs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint interview_feedback_result_check check (result in ('strong','mixed','weak','not_asked'))
);

create table if not exists career_copilot.skill_gaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill text not null,
  category text not null default 'other',
  source_type text not null default 'interview',
  source_id uuid,
  severity integer not null default 3 check (severity between 1 and 5),
  status text not null default 'open',
  evidence text not null default '',
  next_action text not null default '',
  due_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint skill_gaps_source_type_check check (source_type in ('interview','manual','application','assessment')),
  constraint skill_gaps_status_check check (status in ('open','in_progress','resolved','deferred'))
);

create table if not exists career_copilot.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_reviews_period_check check (period_end >= period_start),
  unique(user_id, period_start, period_end)
);

create table if not exists career_copilot.operational_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null,
  status text not null default 'success',
  route text not null default '',
  duration_ms integer not null default 0 check (duration_ms >= 0),
  status_code integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint operational_events_status_check check (status in ('success','warning','failure'))
);

create index if not exists interviews_user_schedule_idx
  on career_copilot.interviews(user_id, scheduled_at desc);
create unique index if not exists interview_feedback_interview_sequence_uidx
  on career_copilot.interview_feedback(interview_id, sequence_no);
create index if not exists interview_feedback_interview_idx
  on career_copilot.interview_feedback(interview_id, created_at);
create unique index if not exists skill_gaps_interview_skill_uidx
  on career_copilot.skill_gaps(user_id, source_type, source_id, skill)
  where source_id is not null;
create index if not exists skill_gaps_user_status_idx
  on career_copilot.skill_gaps(user_id, status, severity desc, updated_at desc);
create index if not exists weekly_reviews_user_period_idx
  on career_copilot.weekly_reviews(user_id, period_end desc);
create index if not exists operational_events_user_created_idx
  on career_copilot.operational_events(user_id, created_at desc);

alter table career_copilot.interview_feedback enable row level security;
alter table career_copilot.skill_gaps enable row level security;
alter table career_copilot.weekly_reviews enable row level security;
alter table career_copilot.operational_events enable row level security;

drop policy if exists interview_feedback_owner_all on career_copilot.interview_feedback;
create policy interview_feedback_owner_all on career_copilot.interview_feedback
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from career_copilot.interviews i
      where i.id = interview_feedback.interview_id
        and i.user_id = (select auth.uid())
    )
  );

drop policy if exists skill_gaps_owner_all on career_copilot.skill_gaps;
create policy skill_gaps_owner_all on career_copilot.skill_gaps
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists weekly_reviews_owner_all on career_copilot.weekly_reviews;
create policy weekly_reviews_owner_all on career_copilot.weekly_reviews
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists operational_events_owner_all on career_copilot.operational_events;
create policy operational_events_owner_all on career_copilot.operational_events
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on
  career_copilot.interviews,
  career_copilot.interview_feedback,
  career_copilot.skill_gaps,
  career_copilot.weekly_reviews,
  career_copilot.operational_events
  to authenticated;
