create schema if not exists career_copilot;
grant usage on schema career_copilot to authenticated, service_role;
create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;
set search_path = career_copilot, public, extensions;

-- Career Copilot V2 core schema
create type job_workplace as enum ('remote','hybrid','onsite','unknown');
create type company_tier as enum ('small','medium','large','unknown');
create type application_status as enum ('discovered','verified','prepared','submitted','read','contacting','test','interview','offer','rejected','paused');
create type approval_status as enum ('pending','approved','rejected');

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  graduation_year int not null default 2028,
  major text not null default '人工智能',
  degree text not null default '本科',
  availability_days int not null default 3,
  availability_months int not null default 3,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  tier company_tier not null default 'unknown',
  stage text,
  size_label text,
  website text,
  industry text,
  logo_url text,
  source_confidence int not null default 3 check (source_confidence between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  source_id text not null unique,
  company_id uuid references companies(id) on delete set null,
  title text not null,
  description text not null,
  requirements text,
  city text,
  district text,
  address text,
  workplace job_workplace not null default 'unknown',
  is_internship boolean not null default true,
  accepts_students boolean,
  accepts_2028 boolean,
  graduation_requirement text,
  days_per_week int,
  minimum_months int,
  salary text,
  published_at date,
  deadline date,
  source_name text,
  source_url text,
  source_reliability int not null default 3 check (source_reliability between 1 and 5),
  channel text not null default 'platform',
  recruiter_email text,
  raw_payload jsonb not null default '{}'::jsonb,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists jobs_location_idx on jobs(city,district,workplace);
create index if not exists jobs_published_idx on jobs(published_at desc);

create table if not exists job_evaluations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references jobs(id) on delete cascade,
  total_score int not null,
  grade text not null,
  segment text not null,
  eligible boolean not null,
  needs_confirmation boolean not null,
  score_breakdown jsonb not null,
  matched_skills jsonb not null default '[]'::jsonb,
  missing_skills jsonb not null default '[]'::jsonb,
  hr_preference text,
  risks jsonb not null default '[]'::jsonb,
  evaluated_at timestamptz not null default now()
);

create table if not exists career_evidence (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  skill text not null,
  project text not null,
  evidence text not null,
  source_url text,
  confidence int not null default 90,
  embedding vector(1536),
  created_at timestamptz not null default now()
);
create index if not exists career_evidence_embedding_idx on career_evidence using hnsw (embedding vector_cosine_ops);

create table if not exists resume_versions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  role_family text not null,
  file_path text,
  content jsonb not null default '{}'::jsonb,
  is_master boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists application_packages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references jobs(id) on delete cascade,
  resume_version_id uuid references resume_versions(id) on delete set null,
  greeting text not null,
  email_subject text,
  email_body text,
  highlighted_keywords jsonb not null default '[]'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  truth_check jsonb not null default '{}'::jsonb,
  approval approval_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references jobs(id) on delete cascade,
  package_id uuid references application_packages(id) on delete set null,
  channel text not null,
  status application_status not null default 'prepared',
  submitted_at timestamptz,
  last_follow_up_at timestamptz,
  next_follow_up_at timestamptz,
  external_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  scheduled_at timestamptz not null,
  round_name text not null,
  mode text,
  interviewer text,
  questions jsonb not null default '[]'::jsonb,
  notes text,
  outcome text,
  created_at timestamptz not null default now()
);

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references applications(id) on delete cascade,
  salary text,
  start_date date,
  deadline date,
  status text not null default 'received',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists source_snapshots (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  source_url text not null,
  content_hash text not null,
  snapshot_text text,
  captured_at timestamptz not null default now(),
  unique(source_url,content_hash)
);
