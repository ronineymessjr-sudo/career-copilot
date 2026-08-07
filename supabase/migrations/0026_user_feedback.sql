-- Migration 0026: User feedback collection
-- Supports in-app feedback widget, expert sessions, CLI, and API channels
-- Dual-path: direct Supabase insert (private) + optional GitHub sync (public)

create table if not exists career_copilot.user_feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references career_copilot.profiles(user_id) on delete set null,
  type        text not null check (type in ('bug', 'feature', 'general', 'praise', 'ux')),
  title       text not null,
  content     text not null,
  email       text,
  source      text not null default 'web' check (source in ('web', 'expert', 'cli', 'api', 'github')),
  page_url    text,
  user_agent  text,
  metadata    jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  resolved    boolean not null default false,
  resolved_at timestamptz,
  resolved_by uuid references career_copilot.profiles(user_id) on delete set null,
  notes       text,
  github_issue_number integer
);

create index if not exists user_feedback_type_idx on career_copilot.user_feedback (type, created_at desc);
create index if not exists user_feedback_user_idx on career_copilot.user_feedback (user_id, created_at desc);
create index if not exists user_feedback_source_idx on career_copilot.user_feedback (source);
create index if not exists user_feedback_resolved_idx on career_copilot.user_feedback (resolved, created_at desc);

-- RLS: authenticated users can insert their own feedback
alter table career_copilot.user_feedback enable row level security;

create policy "Users can insert their own feedback"
  on career_copilot.user_feedback
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can view their own feedback"
  on career_copilot.user_feedback
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Service role has full access"
  on career_copilot.user_feedback
  for all
  to service_role
  using (true)
  with check (true);

-- Allow anonymous feedback (user_id = null) for public forms
create policy "Anyone can submit anonymous feedback"
  on career_copilot.user_feedback
  for insert
  to anon
  with check (user_id is null);

-- RPC: submit feedback (handles both authenticated and anonymous)
create or replace function career_copilot.submit_feedback(
  p_type text,
  p_title text,
  p_content text,
  p_email text default null,
  p_source text default 'web',
  p_page_url text default null,
  p_user_agent text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = career_copilot
as $$
declare
  v_feedback_id uuid;
  v_user_id uuid;
begin
  -- Try to get authenticated user, fall back to null (anonymous)
  v_user_id := auth.uid();

  insert into career_copilot.user_feedback (
    user_id, type, title, content, email, source, page_url, user_agent, metadata
  ) values (
    v_user_id, p_type, p_title, p_content, p_email, p_source, p_page_url, p_user_agent, p_metadata
  )
  returning id into v_feedback_id;

  return v_feedback_id;
end;
$$;

-- RPC: list unresolved feedback (admin)
create or replace function career_copilot.list_feedback(
  p_limit integer default 50,
  p_offset integer default 0,
  p_type text default null,
  p_source text default null,
  p_resolved boolean default null
)
returns table (
  id uuid,
  user_id uuid,
  type text,
  title text,
  content text,
  email text,
  source text,
  page_url text,
  created_at timestamptz,
  resolved boolean,
  github_issue_number integer
)
language plpgsql
security definer
set search_path = career_copilot
as $$
begin
  return query
  select
    f.id, f.user_id, f.type, f.title, f.content, f.email,
    f.source, f.page_url, f.created_at, f.resolved, f.github_issue_number
  from career_copilot.user_feedback f
  where
    (p_type is null or f.type = p_type)
    and (p_source is null or f.source = p_source)
    and (p_resolved is null or f.resolved = p_resolved)
  order by f.created_at desc
  limit p_limit offset p_offset;
end;
$$;
