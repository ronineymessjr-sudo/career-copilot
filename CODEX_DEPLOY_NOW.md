# Run this in the authenticated Codex environment

```bash
unzip -o Career_Copilot_V2_Cloudflare_Release.zip -d career-copilot-release
cd career-copilot-release
./scripts/deploy_cloudflare.sh
cat DEPLOYED_URLS.json
```

Expected completion gates:

- GitHub push targets only `ronineymessjr-sudo/public-apis-resource`.
- `career-copilot-v2` is reachable at a `workers.dev` URL.
- `career-copilot-scheduler` is reachable and reports `configured: true`.
- `/api/runtime` returns HTTP 200.
- Authenticated `/api/cron/daily` returns HTTP 200.
- `DEPLOYED_URLS.json` contains the final public addresses.
