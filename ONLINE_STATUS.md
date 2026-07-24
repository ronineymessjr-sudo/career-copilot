# Online deployment status

## Code status

The Cloudflare release is prepared for a one-command permanent deployment:

```bash
./scripts/deploy_cloudflare.sh
```

The script performs dependency installation, type generation, static checks, Next.js and OpenNext production builds, an optional first push to the dedicated empty GitHub repository, deployment of the web and scheduler Workers, secure secret injection, and public HTTP smoke tests.

## External authorization status

This ChatGPT execution environment does not contain the user's GitHub Contents write token or Cloudflare OAuth/API credentials. Attempts through the connected GitHub integration returned HTTP 403 for both Contents and Git object writes. The environment also cannot currently resolve npm or GitHub domains, so it cannot install Wrangler or create a temporary deployment.

A permanent public URL therefore has not been produced in this environment. Run the command above in the already authenticated Codex environment. No other repository is touched; the default target is `ronineymessjr-sudo/public-apis-resource`.
