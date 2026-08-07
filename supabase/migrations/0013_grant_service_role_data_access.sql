-- The server-only Supabase secret key is used by cron and control routes.
-- Browser clients remain restricted to the authenticated-role RLS policies.
grant usage on schema career_copilot to service_role;
grant select, insert, update, delete on all tables in schema career_copilot to service_role;
grant usage, select on all sequences in schema career_copilot to service_role;
