# Career Copilot R4.0.2 即时画像聚合搜索部署检查清单

## 数据库

- [ ] `supabase migration list` 已核对
- [ ] `supabase db push --dry-run` 只显示预期迁移
- [ ] 已保留适配迁移 `0016`–`0021`
- [ ] 已应用 `0022_instant_profile_aggregate_search.sql`
- [ ] 未执行 reset、DROP TABLE 或 DROP SCHEMA
- [ ] 原用户、岗位、简历、来源和投递记录仍存在

## Secrets 与配置

- [ ] Web Worker 已配置现有 `OPENAI_API_KEY`
- [ ] 可选变量 `OPENAI_SEARCH_MODEL` 已设置或使用默认 `gpt-5-mini`
- [ ] Supabase 与 Cron Secrets 未被覆盖

## 构建门禁

- [ ] `npm run test:complete`
- [ ] `python -m pytest apps/api/tests -q`
- [ ] `python scripts/verify_deployment_adaptations.py`
- [ ] `python scripts/validate_cloudflare.py`
- [ ] `python scripts/verify_complete_package.py`
- [ ] Web 与 Scheduler TypeScript check
- [ ] OpenNext `cf:build`

## 功能验收

- [ ] `/api/runtime` 返回版本 `2.0.2`
- [ ] 岗位页显示“即时画像聚合搜索”
- [ ] 点击一次后创建搜索记录并显示每个平台状态
- [ ] 已连接 Greenhouse、Lever、Ashby 来源能够参与本次搜索
- [ ] 公开网页索引搜索覆盖 Workday、BOSS、LinkedIn、实习僧、牛客、智联、前程无忧、猎聘
- [ ] 搜索结果只包含可核验岗位详情页或申请页
- [ ] 结果进入“本次搜索”筛选并显示来源
- [ ] 高匹配岗位出现“材料已准备”
- [ ] 确认投递后跳转真实申请链接
- [ ] 登录墙或验证码不会被标记为抓取成功

## 多用户与安全

- [ ] 两个账号的搜索记录、结果、画像和材料互相隔离
- [ ] 未保存招聘平台密码、Cookie 或验证码
- [ ] 仅打开申请页面不会被记录为已投递
