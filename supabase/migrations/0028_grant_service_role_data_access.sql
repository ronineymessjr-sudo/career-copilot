-- The original branch used a duplicate 0013 prefix. Keep this idempotent
-- grant as a unique migration so Supabase can record it safely.
grant usage on schema career_copilot to service_role;
grant select, insert, update, delete on all tables in schema career_copilot to service_role;
grant usage, select on all sequences in schema career_copilot to service_role;
