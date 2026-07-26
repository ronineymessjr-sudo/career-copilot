-- Keep the shared pgvector extension in Supabase's extension schema.  Career
-- Copilot tables remain the only application-owned objects in its schema.
alter extension vector set schema extensions;
