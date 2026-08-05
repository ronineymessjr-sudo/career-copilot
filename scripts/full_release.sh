#!/usr/bin/env bash
set -euo pipefail

DEPLOY=0
SKIP_INSTALL=0
SKIP_PYTHON=0

for arg in "$@"; do
  case "$arg" in
    --deploy) DEPLOY=1 ;;
    --skip-install) SKIP_INSTALL=1 ;;
    --skip-python) SKIP_PYTHON=1 ;;
    *) echo "未知参数: $arg" >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

for cmd in node npm npx; do
  command -v "$cmd" >/dev/null || { echo "缺少命令: $cmd" >&2; exit 1; }
done
if [[ "$SKIP_PYTHON" -eq 0 ]]; then
  command -v python >/dev/null || { echo "缺少命令: python" >&2; exit 1; }
fi

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [[ "$NODE_MAJOR" -lt 22 ]]; then
  echo "需要 Node.js 22+，当前版本: $(node --version)" >&2
  exit 1
fi

echo "== Career Copilot V2 full release =="
echo "Project: $ROOT"

if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  npm install --registry="${NPM_REGISTRY:-https://registry.npmjs.org}" --no-audit --no-fund
fi

npm --workspace workers/scheduler run cf-typegen
npm run test:complete

if [[ "$SKIP_PYTHON" -eq 0 ]]; then
  python -m pytest apps/api/tests -q
  python scripts/validate_cloudflare.py
  python scripts/verify_complete_package.py
  npm run smoke:m08.1
fi

npm --workspace apps/web run check
npm --workspace workers/scheduler run check
npm --workspace apps/web run cf:build

if [[ "$DEPLOY" -eq 1 ]]; then
  (cd apps/web && npx opennextjs-cloudflare deploy)
  (cd workers/scheduler && npx wrangler deploy)
  echo "部署完成。请按 DEPLOY_CHECKLIST.md 验收线上端点。"
else
  echo "全部门禁和构建已通过。添加 --deploy 执行正式部署。"
fi
