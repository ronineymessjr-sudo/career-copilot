# Career Copilot Complete Platform 部署检查清单

## 源码与数据库

- [ ] 当前目录是完整源码，不是旧补丁目录
- [ ] 已阅读 `DATABASE_DEPLOYMENT_NOTE.md`
- [ ] `supabase migration list` 已核对
- [ ] `supabase db push --dry-run` 仅显示预期迁移
- [ ] 已应用 `0014_complete_platform_job_pool.sql`
- [ ] 未运行 database reset、DROP TABLE 或 DROP SCHEMA
- [ ] 生产数据和 Auth 用户仍存在

## 门禁

- [ ] `npm run test:complete`
- [ ] `python -m pytest apps/api/tests -q`
- [ ] `python scripts/validate_cloudflare.py`
- [ ] `python scripts/verify_complete_package.py`
- [ ] `npm run smoke:m08.1`
- [ ] Scheduler `cf-typegen`
- [ ] Web 与 Scheduler TypeScript check
- [ ] OpenNext `cf:build`

## 完整产品

- [ ] 今日简报可用
- [ ] 数据看板可用
- [ ] 岗位池展示全部岗位，不因画像隐藏
- [ ] 搜索、地点、来源、办公方式和排序可用
- [ ] 岗位来源包含 Greenhouse、Lever、Ashby
- [ ] 手动 URL/JD 导入可用
- [ ] 新账号没有 AI、2028、地点或实习的固定偏好
- [ ] 画像修改后推荐顺序变化
- [ ] 待投递为空时说明原因和下一步
- [ ] 简历版本和项目证据入口可用

## 多用户隔离

- [ ] 账号 A 与 B 均可看到 public 岗位
- [ ] 账号 A 看不到账号 B 的 private 岗位
- [ ] 两个账号的评价、简历、证据和投递记录独立
- [ ] 对共享岗位的用户核验不会修改其他账号

## 部署与线上

- [ ] Web Worker 部署成功
- [ ] Scheduler Worker 部署成功
- [ ] Worker secrets 保留
- [ ] `/api/runtime` 正常且 Supabase 已配置
- [ ] `/playground` 匿名 200
- [ ] 匿名 `/api/control/jobs` 401
- [ ] Scheduler `/health` 正常
- [ ] 桌面和手机均无横向溢出
