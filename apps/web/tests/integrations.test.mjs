import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../..", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Gmail drafts use the application-owned connection instead of a client token", async () => {
  const route = await read("apps/web/app/api/control/applications/[id]/gmail-draft/route.ts");
  assert.match(route, /gmailAccessToken\(auth\.userId\)/);
  assert.doesNotMatch(route, /body\.gmail_access_token/);
});

test("provider credential tables are private and encrypted at rest", async () => {
  const migration = await read("supabase/migrations/0010_application_integrations.sql");
  assert.match(migration, /access_token_ciphertext text not null/);
  assert.match(migration, /refresh_token_ciphertext text/);
  assert.match(migration, /revoke all on career_copilot\.provider_connections from anon, authenticated/);
  assert.match(migration, /alter table career_copilot\.provider_connections enable row level security/);
});

test("Gmail OAuth uses PKCE and never enables automatic sending", async () => {
  const start = await read("apps/web/app/api/control/integrations/gmail/start/route.ts");
  const catalog = await read("apps/web/app/api/control/integrations/route.ts");
  assert.match(start, /code_challenge_method: "S256"/);
  assert.match(catalog, /automatic_send: false/);
});
