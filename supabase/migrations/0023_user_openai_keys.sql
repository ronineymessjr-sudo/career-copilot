-- 0023: per-user OpenAI API key (BYOK) with owner-scoped RLS.
-- Users store their own key; service reads it server-side only, never to the browser.

do $$
declare
  app_schema text := case
    when to_regclass('career_copilot.jobs') is not null then 'career_copilot'
    else 'public'
  end;
begin
  execute format($sql$
    create table if not exists %I.user_openai_keys (
      user_id uuid primary key references auth.users(id) on delete cascade,
      api_key text not null default '',
      source text not null default 'self',
      updated_at timestamptz not null default now()
    )
  $sql$, app_schema);

  execute format('alter table %I.user_openai_keys enable row level security', app_schema);
  execute format('drop policy if exists user_openai_keys_owner_all on %I.user_openai_keys', app_schema);
  execute format('create policy user_openai_keys_owner_all on %I.user_openai_keys for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', app_schema);
  execute format('grant select, insert, update, delete on %I.user_openai_keys to authenticated', app_schema, app_schema);
end $$;
