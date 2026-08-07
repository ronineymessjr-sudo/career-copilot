# 给部署执行端的增量任务 — Career Copilot R4.0.2

当前目标是把已完成部署端适配的 R4.0.1 / `2.0.1` 升级到 `2.0.2`。不得从未适配的原始 R4 覆盖仓库。

## 强制步骤

1. 阅读 `DATABASE_DEPLOYMENT_NOTE.md`、`SECRETS_REQUIRED.md` 和部署端适配清单。
2. 确认当前应用版本为 `2.0.1`，迁移已到 `0021`。
3. 应用本增量补丁并保留全部部署适配。
4. 数据库只允许增量迁移：

```bash
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

5. 确认 Web Worker 已有 `OPENAI_API_KEY`。`OPENAI_SEARCH_MODEL` 可使用默认 `gpt-5-mini`。
6. 执行门禁：

```bash
npm run test:complete
python -m pytest apps/api/tests -q
python scripts/verify_deployment_adaptations.py
python scripts/validate_cloudflare.py
python scripts/verify_complete_package.py
npm --workspace apps/web run check
npm --workspace workers/scheduler run check
npm --workspace apps/web run cf:build
```

7. 本版只部署 Web Worker；Scheduler 代码没有修改：

```bash
cd apps/web
npx opennextjs-cloudflare deploy
```

8. 按 `DEPLOY_CHECKLIST.md` 验收。

## 不得宣称成功的情况

- `0022` 未应用；
- `/api/runtime` 不是 `2.0.2`；
- 搜索按钮只打开平台搜索页而没有返回岗位；
- 平台没有明确状态反馈；
- 搜索结果没有真实岗位详情或申请链接；
- 高匹配结果无法进入现有材料准备链路；
- 任何一项部署适配审计失败。
