-- Complete user profile, private multi-resume library, and per-user daily recommendations.
-- This migration is additive and does not delete existing profiles, resumes, jobs, or applications.

alter table career_copilot.profiles alter column graduation_year drop not null;
alter table career_copilot.profiles alter column graduation_year drop default;

alter table career_copilot.profiles
  add column if not exists profile_details jsonb not null default '{
    "display_name":"",
    "phone":"",
    "current_city":"",
    "headline":"",
    "summary":"",
    "years_experience":0,
    "skills":[],
    "experience":[],
    "education":[],
    "projects":[],
    "languages":[],
    "certifications":[],
    "links":[]
  }'::jsonb;

alter table career_copilot.resume_versions
  add column if not exists source_type text not null default 'generated',
  add column if not exists original_filename text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint,
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists plain_text text not null default '',
  add column if not exists notes text not null default '',
  add column if not exists approved_at timestamptz,
  add column if not exists last_used_at timestamptz;

alter table career_copilot.resume_versions drop constraint if exists resume_versions_source_type_check;
alter table career_copilot.resume_versions add constraint resume_versions_source_type_check
  check (source_type in ('uploaded','manual','profile','generated','legacy'));

alter table career_copilot.resume_versions drop constraint if exists resume_versions_persona_check;
alter table career_copilot.resume_versions add constraint resume_versions_persona_check
  check (persona in ('agent_engineer','ai_product','ai_solution','local_transition','general','uploaded'));

-- Preserve only the most recently updated active master per profile before
-- enforcing the uniqueness rule. This makes the migration safe for existing data.
with ranked_masters as (
  select id, row_number() over (
    partition by profile_id
    order by updated_at desc nulls last, created_at desc nulls last, id desc
  ) as master_rank
  from career_copilot.resume_versions
  where is_master = true and status <> 'archived'
)
update career_copilot.resume_versions rv
set is_master = false
from ranked_masters rm
where rv.id = rm.id and rm.master_rank > 1;

create unique index if not exists resume_versions_one_master_per_profile_uidx
  on career_copilot.resume_versions(profile_id)
  where is_master = true and status <> 'archived';
create index if not exists resume_versions_profile_status_updated_idx
  on career_copilot.resume_versions(profile_id, status, updated_at desc);

create table if not exists career_copilot.daily_recommendation_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  timezone text not null default 'Asia/Shanghai',
  recommendation_limit integer not null default 10 check (recommendation_limit between 1 and 30),
  minimum_score integer not null default 70 check (minimum_score between 0 and 100),
  auto_prepare_enabled boolean not null default true,
  auto_prepare_limit integer not null default 3 check (auto_prepare_limit between 0 and 10),
  require_profile_score integer not null default 60 check (require_profile_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists career_copilot.daily_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_date date not null,
  status text not null default 'completed' check (status in ('completed','partial','skipped','failed')),
  summary jsonb not null default '{}'::jsonb,
  ranked_job_ids jsonb not null default '[]'::jsonb,
  prepared_application_ids jsonb not null default '[]'::jsonb,
  skip_reason text not null default '',
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, recommendation_date)
);

create index if not exists daily_recommendations_user_date_idx
  on career_copilot.daily_recommendations(user_id, recommendation_date desc);

alter table career_copilot.daily_recommendation_preferences enable row level security;
alter table career_copilot.daily_recommendations enable row level security;

drop policy if exists daily_recommendation_preferences_owner_all on career_copilot.daily_recommendation_preferences;
create policy daily_recommendation_preferences_owner_all on career_copilot.daily_recommendation_preferences
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists daily_recommendations_owner_select on career_copilot.daily_recommendations;
create policy daily_recommendations_owner_select on career_copilot.daily_recommendations
  for select to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on career_copilot.daily_recommendation_preferences to authenticated;
grant select on career_copilot.daily_recommendations to authenticated;

-- Private resume file storage. Structured resume content remains in
-- career_copilot.resume_versions; uploaded PDF/DOC/DOCX/TXT bytes are stored here.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resume-files',
  'resume-files',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists resume_files_owner_select on storage.objects;
create policy resume_files_owner_select on storage.objects
  for select to authenticated
  using (bucket_id = 'resume-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists resume_files_owner_insert on storage.objects;
create policy resume_files_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'resume-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists resume_files_owner_update on storage.objects;
create policy resume_files_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'resume-files' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'resume-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists resume_files_owner_delete on storage.objects;
create policy resume_files_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'resume-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
