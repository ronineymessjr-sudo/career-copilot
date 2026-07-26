# Deployment Handoff — Milestone 05

## 1. Apply the database migration

Apply migrations `0001` through `0005` in order. Confirm these objects exist afterward:

- `job_sources`
- `discovery_runs`
- `jobs.hr_verified_fields`
- `jobs.hr_verified_at`
- Gmail/export fields on `application_packages`

## 2. Configure Supabase Auth and Google

- Keep the private operator account.
- Enable the Google provider.
- Enable Manual Identity Linking.
- In Supabase Auth URL Configuration, add this application redirect URL:

```text
https://career-copilot-v2.photomagic.workers.dev/applications
```

- In Google Cloud, use the Supabase provider callback URL shown by the Supabase dashboard, normally:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

- Configure the OAuth consent screen and enable Gmail API.
- For the private single-operator acceptance run, keep the Google OAuth app in Testing and add the operator account as a test user.
- The application requests `gmail.compose`, the scope required by Drafts Create. Google describes that scope as managing drafts and sending mail; this repository invokes only Drafts Create and has no send endpoint.

## 3. Configure repository secrets

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
CRON_SHARED_SECRET
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
OWNER_USER_ID
```

`OWNER_USER_ID` is the Supabase Auth UUID of the single operator account used by the daily Cron. `SUPABASE_SECRET_KEY` must remain server-only.

## 4. Push and deploy

```bash
git push origin main
```

The GitHub workflow validates, deploys both Workers, applies every required Worker secret, runs a production smoke test, and uploads `DEPLOYED_URLS.json` plus runtime evidence. Optionally set the repository variable `CAREER_COPILOT_WEB_URL`; otherwise the workflow uses the current `photomagic.workers.dev` URL. An authenticated terminal may instead run:

```bash
./scripts/deploy_cloudflare.sh
```

## 5. Configure sources

After login:

1. Open `/sources`.
2. Add a Greenhouse board token or Lever site name.
3. Use restrictive keywords and locations.
4. Run discovery manually once.
5. Review imported jobs and verify unknown HR facts.

The Cron runs daily at `11:00 UTC`, which is `19:00` in Asia/Shanghai.

## 6. Gmail draft acceptance

1. Prepare and approve a package until it reaches `ready_to_submit`.
2. Select **连接 Gmail**.
3. Complete Google consent.
4. Select **创建 Gmail 草稿** and provide the recruiter address.
5. Open Gmail and verify the message is in Drafts.
6. Verify nothing appears in Sent.

Do not put Google access tokens, Supabase keys or Cloudflare tokens into chat or source control.

## 7. Final production test

Run the 13-step acceptance flow in `docs/MILESTONE_05.md`. Save evidence as screenshots or a local JSON report without passwords, tokens, email bodies or personal data.
