# Deploy now from Codex

The exact prepared Git commit is:

```text
2c25e391f26cabaec5be04804e5782f70ade10ec
```

Target repository:

```text
https://github.com/ronineymessjr-sudo/public-apis-resource.git
```

## Preferred path

```bash
unzip -o Career_Copilot_V2_Cloudflare_Release.zip -d career-copilot-release
cd career-copilot-release/career-copilot-cloudflare
export TARGET_REPO_URL="https://github.com/ronineymessjr-sudo/public-apis-resource.git"
./scripts/deploy_cloudflare.sh
cat DEPLOYED_URLS.json
```

The script performs dependency installation, validation, Git push, OpenNext build, Web Worker deployment, Cron Worker deployment and public smoke checks.

## Exact-commit path

```bash
git clone Career_Copilot_V2_Cloudflare_Release.bundle career-copilot-v2
cd career-copilot-v2
git remote set-url origin https://github.com/ronineymessjr-sudo/public-apis-resource.git
git push -u origin main
./scripts/deploy_cloudflare.sh
cat DEPLOYED_URLS.json
```
