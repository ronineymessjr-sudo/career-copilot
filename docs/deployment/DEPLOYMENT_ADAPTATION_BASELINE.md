# Career Copilot 部署端适配基线（必须保留）

原始适配基线：R4 / 2.0.0；当前热修复目标：R4.0.1 / 2.0.2。后续补丁不得从未适配的原始包覆盖本文件列出的修复。

## 核心运行适配

1. Data API 固定使用 `career_copilot` schema，并设置 `Accept-Profile` / `Content-Profile`。
2. `layout.tsx` 强制动态渲染并注入公开 Supabase 运行时配置。
3. 浏览器 Supabase 客户端优先读取 `__CAREER_COPILOT_PUBLIC_CONFIG__`。
4. Web `tsconfig.json` 保持 `allowJs: true`。
5. `apps/web/lib` 的 MJS 声明使用 `.d.mts`，引用显式补 `.mjs`。
6. Scheduler cron 使用 `0 12 * * SUN`，类型使用 `ScheduledController`，Worker tsconfig 避免 DOM 类型冲突。
7. 校验脚本排除依赖和构建目录，不得含损坏的替换字符。
8. GitHub Actions 的 validate 与 deploy job 均恢复 Linux `@ast-grep/napi-linux-x64-gnu@0.40.5`。
9. Windows pytest 清理逻辑必须保留。
10. Web `check` 必须为 `tsc --noEmit`，Radix Dialog 使用有效的 `^1.1.14`。
11. Gmail Draft 只使用服务端连接令牌，不接收客户端 token。

## 固定迁移编号

- `0016_rls_grants_shared_pool.sql`
- `0017_application_kits_one_click_handoff.sql`
- `0018_recommendation_experience.sql`
- `0019_material_versions_application_tracking.sql`
- `0020_platform_scale_quality_analytics.sql`

新迁移从 `0021` 开始。本次来源连接修复使用：

- `0021_source_connections_and_platform_search.sql`

## 发布门禁

```bash
npm run test:complete
npm run check
python scripts/verify_deployment_adaptations.py
python scripts/validate_cloudflare.py
python -m pytest apps/api/tests -q
python scripts/verify_complete_package.py
```
