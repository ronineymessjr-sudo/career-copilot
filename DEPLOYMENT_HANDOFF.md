# Deployment Handoff

The codebase is ready for the user's execution Agent to deploy.

## Required production setup

1. Create a Supabase project.
2. Apply `supabase/migrations/0001_core.sql`.
3. Configure Supabase Auth, Storage and Row Level Security.
4. Replace the local SQLite repository with a Supabase/Postgres repository implementation.
5. Install and build `apps/web`.
6. Deploy `apps/api` and connect environment variables.
7. Configure Cloudflare domain and scheduled jobs.
8. Add secrets through the deployment platform; do not commit them.

## Environment values to provide

- Supabase URL
- Supabase anonymous key
- Supabase service-role key for backend only
- LLM provider key
- Gmail OAuth credentials when the draft feature is enabled
- Feishu app credentials when approval cards are enabled

## Production gates

- Run backend tests
- Run `npm run build`
- Run desktop/mobile E2E tests
- Confirm Row Level Security
- Confirm no private resume data is exposed through public endpoints
- Keep external submission disabled until explicit approval is implemented
