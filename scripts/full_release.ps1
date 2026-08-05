param(
  [switch]$Deploy,
  [switch]$SkipInstall,
  [switch]$SkipPython
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "缺少命令：$Name"
  }
}

function Run-Step([string]$Title, [scriptblock]$Command) {
  Write-Host "`n== $Title ==" -ForegroundColor Cyan
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Title 失败，退出码：$LASTEXITCODE"
  }
}

Require-Command node
Require-Command npm
Require-Command npx
if (-not $SkipPython) { Require-Command python }

Write-Host "== Career Copilot V2 full release ==" -ForegroundColor Cyan
Write-Host "Project: $Root"

if (-not $SkipInstall) {
  Run-Step "安装 npm 依赖" { npm install --no-audit --no-fund }
}

Run-Step "生成 Scheduler Cloudflare 类型" { npm --workspace workers/scheduler run cf-typegen }
Run-Step "运行核心 Node 测试" { npm run test:m08.1 }
Run-Step "运行投递与简历匹配测试" { npm run test:integrations }

if (-not $SkipPython) {
  Run-Step "运行 Python API 测试" { python -m pytest apps/api/tests -q }
  Run-Step "验证 Cloudflare 项目结构" { python scripts/validate_cloudflare.py }
}

Run-Step "检查 Web TypeScript" { npm --workspace apps/web run check }
Run-Step "检查 Scheduler TypeScript" { npm --workspace workers/scheduler run check }
Run-Step "构建 OpenNext Web Worker" { npm --workspace apps/web run cf:build }

if ($Deploy) {
  Push-Location apps/web
  try { Run-Step "部署 Web Worker" { npx opennextjs-cloudflare deploy } } finally { Pop-Location }

  Push-Location workers/scheduler
  try { Run-Step "部署 Scheduler Worker" { npx wrangler deploy } } finally { Pop-Location }

  Write-Host "`n部署完成。请按 DEPLOY_CHECKLIST.md 验收线上端点。" -ForegroundColor Green
} else {
  Write-Host "`n全部门禁和构建已通过。添加 -Deploy 执行正式部署。" -ForegroundColor Green
}
