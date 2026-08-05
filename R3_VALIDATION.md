# R3 Validation Record

- Release: Career Copilot V2 Complete Platform R3
- Application version: 1.1.0
- Latest migration: 0016_application_kits_one_click_handoff.sql

## Passed

- 76 Node tests
- 14 Python API tests
- 109 TypeScript/TSX files parsed with zero syntax diagnostics
- All `.mjs` files passed `node --check`
- Cloudflare validation
- Complete package validation
- CSS structural validation
- Offline Milestone 08.1 smoke

## Deployment-only gates

The packaging environment timed out while installing dependencies from the official npm registry. No partial dependency directory or lock file was created. The deployment machine must run:

```bash
npm install --registry=https://registry.npmjs.org --no-audit --no-fund
npm --workspace apps/web run check
npm --workspace workers/scheduler run check
npm --workspace apps/web run cf:build
```
