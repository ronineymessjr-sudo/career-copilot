set search_path = career_copilot, public, extensions;

create index if not exists provider_oauth_states_user_id_idx
  on career_copilot.provider_oauth_states(user_id);
