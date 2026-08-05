# 给部署执行端的完整任务 — Career Copilot R3

当前目录是完整项目根目录。不要寻找、下载或叠加旧补丁。

## 目标

将 R3 部署到现有 Supabase 与同名 Cloudflare Workers，保留全部生产数据和 Secrets。

## 强制步骤

1. 阅读 `DATABASE_DEPLOYMENT_NOTE.md` 与 `SECRETS_REQUIRED.md`。
2. 检查 Node.js 22+、npm、Python 和 Supabase CLI。
3. 使用官方 npm registry 安装依赖：

```bash
npm install --registry=https://registry.npmjs.org --no-audit --no-fund
```

4. 数据库只允许迁移，不允许 reset：

```bash
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

5. 执行所有门禁：

```bash
npm --workspace workers/scheduler run cf-typegen
npm run test:complete
python -m pytest apps/api/tests -q
python scripts/validate_cloudflare.py
python scripts/verify_complete_package.py
npm run smoke:m08.1
npm --workspace apps/web run check
npm --workspace workers/scheduler run check
npm --workspace apps/web run cf:build
```

6. 部署：

```bash
(cd apps/web && npx opennextjs-cloudflare deploy)
(cd workers/scheduler && npx wrangler deploy)
```

7. 按 `DEPLOY_CHECKLIST.md` 验收。

## 不得宣称成功的情况

- OpenNext 构建未通过；
- 0016 未应用；
- `/api/runtime` 不是 `1.1.0`；
- 定制简历或材料包无法打开；
- 点击投递没有打开预填邮件或真实申请链接；
- 仅打开页面却被记录成已提交。
