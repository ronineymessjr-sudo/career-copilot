# Career Copilot V2 — R4.0.2

Career Copilot 是一个多用户岗位聚合、个性化推荐与投递准备工作台。

## R4.0.2 即时画像聚合搜索

- 用户在“岗位发现”中点击一次“开始聚合搜索”，系统立即按照当前账号画像执行搜索，不依赖每日任务。
- 已连接的 Greenhouse、Lever、Ashby 公司来源继续使用公开 ATS 接口读取岗位。
- Workday、BOSS、LinkedIn、实习僧、牛客、智联、前程无忧、猎聘通过公开网页索引查找可核验的岗位详情页。
- 所有结果统一进入当前用户的私有岗位池，执行去重、资格分析、画像排序和来源标记。
- 页面反馈每个平台的搜索状态、结果数量和失败原因。
- 高匹配且材料齐全的岗位自动选择最佳简历并生成投递文案，用户确认后跳转真实投递页。
- 不伪造登录墙、验证码后或无法核验的岗位结果。
- 用户可在“设置”中填写自己的 OpenAI API Key（服务端存储，浏览器不回读明文），获得更强网页搜索。
- 新迁移：`0022_instant_profile_aggregate_search.sql`、`0023_user_openai_keys.sql`。

## R4.0.1 招聘来源连接

- Greenhouse、Lever、Ashby 支持直接粘贴完整公司招聘页并测试连接。
- Workday、BOSS、LinkedIn、实习僧、牛客、智联、前程无忧、猎聘提供可点击来源。
- 迁移：`0021_source_connections_and_platform_search.sql`。

## 技术栈

- Next.js 15 / React 19 / TypeScript
- OpenNext for Cloudflare Workers
- Cloudflare Scheduler Worker
- Supabase Auth、Postgres、RLS、Storage
- OpenAI Responses API Web Search（公开网页索引搜索）
- Python FastAPI 备用 API 与测试

## 部署门禁

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

完整部署流程见 `DEPLOY_WITH_DEEPSPEED.md`。
