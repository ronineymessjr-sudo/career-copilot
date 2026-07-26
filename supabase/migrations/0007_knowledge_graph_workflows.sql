-- Milestone 07: Career Vault document knowledge base, vector retrieval with citations,
-- and durable LangGraph-compatible human-interrupt workflows.
-- Retrieved chunks remain unverified until a user explicitly approves promotion
-- into Career Vault evidence.

create extension if not exists vector;

create table if not exists public.career_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  source_type text not null default 'text',
  source_url text,
  mime_type text not null default 'text/plain',
  content_hash text not null,
  status text not null default 'active',
  embedding_provider text not null default 'none',
  embedding_model text not null default '',
  chunk_count integer not null default 0 check (chunk_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint career_documents_source_type_check check (source_type in ('text','markdown','json','csv','resume','project','note','other')),
  constraint career_documents_status_check check (status in ('processing','active','needs_review','archived','failed')),
  unique(user_id, content_hash)
);

create table if not exists public.career_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  document_id uuid not null references public.career_documents(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  heading text not null default '',
  content text not null,
  content_hash text not null,
  char_start integer not null default 0 check (char_start >= 0),
  char_end integer not null default 0 check (char_end >= char_start),
  token_estimate integer not null default 0 check (token_estimate >= 0),
  provenance jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  embedding_status text not null default 'pending',
  embedding_provider text not null default 'none',
  embedding_model text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint career_chunks_embedding_status_check check (embedding_status in ('pending','ready','lexical_only','failed')),
  unique(document_id, chunk_index)
);

create table if not exists public.workflow_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workflow_type text not null,
  subject_type text not null default '',
  subject_id uuid,
  status text not null default 'running',
  current_step text not null default 'start',
  state jsonb not null default '{}'::jsonb,
  interrupt_payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint workflow_threads_type_check check (workflow_type in ('evidence_promotion','application_review','document_review')),
  constraint workflow_threads_status_check check (status in ('running','waiting_for_human','completed','rejected','cancelled','failed'))
);

create table if not exists public.workflow_checkpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.workflow_threads(id) on delete cascade,
  sequence_no integer not null check (sequence_no >= 0),
  step text not null,
  state jsonb not null default '{}'::jsonb,
  interrupt_payload jsonb not null default '{}'::jsonb,
  decision jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(thread_id, sequence_no)
);

-- Internal serialized checkpoint storage used by the LangGraph custom saver.
-- Payloads are serializer-controlled base64 strings and must never contain API keys.
create table if not exists public.langgraph_checkpoints (
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id text not null,
  checkpoint_ns text not null default '',
  checkpoint_id text not null,
  parent_checkpoint_id text,
  checkpoint_type text not null,
  checkpoint_payload text not null,
  metadata_type text not null,
  metadata_payload text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, thread_id, checkpoint_ns, checkpoint_id),
  constraint langgraph_thread_id_length_check check (length(thread_id) between 1 and 255)
);

create table if not exists public.langgraph_writes (
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id text not null,
  checkpoint_ns text not null default '',
  checkpoint_id text not null,
  task_id text not null,
  idx integer not null,
  channel text not null,
  value_type text not null,
  value_payload text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, thread_id, checkpoint_ns, checkpoint_id, task_id, idx),
  constraint langgraph_writes_thread_id_length_check check (length(thread_id) between 1 and 255)
);

create unique index if not exists career_evidence_profile_source_ref_uidx
  on public.career_evidence(profile_id, source_ref)
  where source_ref is not null and source_ref <> '';
create index if not exists career_documents_user_updated_idx
  on public.career_documents(user_id, updated_at desc);
create index if not exists career_chunks_document_idx
  on public.career_chunks(document_id, chunk_index);
create index if not exists career_chunks_user_status_idx
  on public.career_chunks(user_id, embedding_status, updated_at desc);
create index if not exists career_chunks_embedding_idx
  on public.career_chunks using hnsw (embedding vector_cosine_ops)
  where embedding is not null;
create index if not exists career_chunks_text_idx
  on public.career_chunks using gin (to_tsvector('simple', content));
create index if not exists workflow_threads_user_status_idx
  on public.workflow_threads(user_id, status, updated_at desc);
create index if not exists workflow_checkpoints_thread_sequence_idx
  on public.workflow_checkpoints(thread_id, sequence_no desc);
create index if not exists langgraph_checkpoints_thread_created_idx
  on public.langgraph_checkpoints(user_id, thread_id, checkpoint_ns, created_at desc);

alter table public.career_documents enable row level security;
alter table public.career_chunks enable row level security;
alter table public.workflow_threads enable row level security;
alter table public.workflow_checkpoints enable row level security;
alter table public.langgraph_checkpoints enable row level security;
alter table public.langgraph_writes enable row level security;

drop policy if exists career_documents_owner_all on public.career_documents;
create policy career_documents_owner_all on public.career_documents
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = career_documents.profile_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists career_chunks_owner_all on public.career_chunks;
create policy career_chunks_owner_all on public.career_chunks
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.career_documents d
      where d.id = career_chunks.document_id
        and d.user_id = (select auth.uid())
    )
  );

drop policy if exists workflow_threads_owner_all on public.workflow_threads;
create policy workflow_threads_owner_all on public.workflow_threads
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists workflow_checkpoints_owner_all on public.workflow_checkpoints;
create policy workflow_checkpoints_owner_all on public.workflow_checkpoints
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.workflow_threads t
      where t.id = workflow_checkpoints.thread_id
        and t.user_id = (select auth.uid())
    )
  );

drop policy if exists langgraph_checkpoints_owner_all on public.langgraph_checkpoints;
create policy langgraph_checkpoints_owner_all on public.langgraph_checkpoints
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists langgraph_writes_owner_all on public.langgraph_writes;
create policy langgraph_writes_owner_all on public.langgraph_writes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on
  public.career_documents,
  public.career_chunks,
  public.workflow_threads,
  public.workflow_checkpoints,
  public.langgraph_checkpoints,
  public.langgraph_writes
  to authenticated;

create or replace function public.match_career_chunks(
  query_embedding vector(1536),
  match_threshold double precision default 0.20,
  match_count integer default 8
)
returns table (
  id uuid,
  document_id uuid,
  document_title text,
  source_url text,
  chunk_index integer,
  heading text,
  content text,
  provenance jsonb,
  content_hash text,
  char_start integer,
  char_end integer,
  similarity double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    c.document_id,
    d.title as document_title,
    d.source_url,
    c.chunk_index,
    c.heading,
    c.content,
    c.provenance,
    c.content_hash,
    c.char_start,
    c.char_end,
    (1 - (c.embedding <=> query_embedding))::double precision as similarity
  from public.career_chunks c
  join public.career_documents d on d.id = c.document_id
  where c.user_id = (select auth.uid())
    and d.user_id = (select auth.uid())
    and d.status = 'active'
    and c.embedding is not null
    and (1 - (c.embedding <=> query_embedding)) >= match_threshold
  order by c.embedding <=> query_embedding
  limit greatest(1, least(match_count, 20));
$$;

revoke all on function public.match_career_chunks(vector, double precision, integer) from public, anon;
grant execute on function public.match_career_chunks(vector, double precision, integer) to authenticated;
