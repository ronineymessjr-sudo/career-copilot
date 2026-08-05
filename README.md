# Career Copilot V2 — Complete Platform R4

Career Copilot 是一个多用户岗位聚合、个性化推荐与投递准备工作台。

## R3 新增

- 完整岗位定制简历内容
- 招呼语、求职信、邮件、申请理由与常见问答
- 可打印并保存为 PDF 的定制简历
- 完整投递材料包 HTML 与申请问答 Markdown
- 招聘邮箱 `mailto:` 预填
- 真实招聘页面一键跳转
- 项目证据可选，不再作为所有岗位的通用阻塞条件
- 迁移 `0020_platform_scale_quality_analytics.sql`

## 技术栈

- Next.js 15 / React 19 / TypeScript
- OpenNext for Cloudflare Workers
- Cloudflare Scheduler Worker
- Supabase Auth、Postgres、RLS、Storage
- Python FastAPI 备用 API 与测试

## 快速部署

```bash
npm install --registry=https://registry.npmjs.org --no-audit --no-fund
npm run test:complete
python -m pytest apps/api/tests -q
python scripts/validate_cloudflare.py
python scripts/verify_complete_package.py
npm --workspace workers/scheduler run cf-typegen
npm --workspace apps/web run check
npm --workspace workers/scheduler run check
npm --workspace apps/web run cf:build
```

完整部署流程见 `DEPLOY_WITH_DEEPSPEED.md`。
