# Deploy Milestone 08.1 from Codex

Version: `1.0.1`

```bash
git log -1 --oneline
npm install --no-audit --no-fund
npm run test:m08.1
npm run evaluation:m08.1
npm run smoke:m08.1
npm run check
python -m pytest apps/api/tests -q
python scripts/validate_cloudflare.py
git push origin main
```

GitHub Actions is expected to build and deploy the Web and Scheduler Workers, then verify the public Playground and runtime safety flags.
