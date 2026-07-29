set search_path = career_copilot, public, extensions;

-- Application-owned provider credentials. Ciphertext is only readable by the
-- server using the Supabase secret key; browser clients never receive it.
create table if not exists career_copilot.provider_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  account_email text,
  scopes text[] not null default '{}',
  access_token_ciphertext text not null,
  refresh_token_ciphertext text,
  token_expires_at timestamptz,
  status text not null default 'connected',
  last_error text not null default '',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_connections_provider_check check (provider in ('gmail')),
  constraint provider_connections_status_check check (status in ('connected', 'reauthorization_required', 'disconnected')),
  unique (user_id, provider)
);

create table if not exists career_copilot.provider_oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  state_hash text not null unique,
  code_verifier_ciphertext text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint provider_oauth_states_provider_check check (provider in ('gmail'))
);

create index if not exists provider_connections_user_provider_idx
  on career_copilot.provider_connections(user_id, provider);
create index if not exists provider_oauth_states_expiry_idx
  on career_copilot.provider_oauth_states(expires_at);

alter table career_copilot.provider_connections enable row level security;
alter table career_copilot.provider_oauth_states enable row level security;

drop policy if exists provider_connections_deny_browser_access on career_copilot.provider_connections;
create policy provider_connections_deny_browser_access
  on career_copilot.provider_connections
  for all
  to authenticated
  using (false)
  with check (false);

drop policy if exists provider_oauth_states_deny_browser_access on career_copilot.provider_oauth_states;
create policy provider_oauth_states_deny_browser_access
  on career_copilot.provider_oauth_states
  for all
  to authenticated
  using (false)
  with check (false);

-- Do not grant authenticated users direct table access. API routes authenticate
-- the caller, then use the server-only Supabase secret key to operate on these
-- encrypted records. This prevents a browser bearer token from exfiltrating a
-- provider refresh token through PostgREST.
revoke all on career_copilot.provider_connections from anon, authenticated;
revoke all on career_copilot.provider_oauth_states from anon, authenticated;
