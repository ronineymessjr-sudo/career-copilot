# 最终部署检查清单

## 源码

- [ ] 当前目录是完整源码，不是增量补丁目录
- [ ] 没有 `.env`、token、Cookie 或真实密钥
- [ ] `apps/web/app/globals.css` 为 Carbon Pro 最终设计系统
- [ ] `/jobs` 只保留选岗位主流程
- [ ] `/applications` 只保留待投递、补齐和记录主流程

## 门禁

- [ ] `npm run test:m08.1`
- [ ] `npm run test:integrations`
- [ ] `python -m pytest apps/api/tests -q`
- [ ] `npm --workspace workers/scheduler run cf-typegen`
- [ ] `npm --workspace apps/web run check`
- [ ] `npm --workspace workers/scheduler run check`
- [ ] `python scripts/validate_cloudflare.py`
- [ ] `npm --workspace apps/web run cf:build`

## 部署

- [ ] Web Worker 部署成功
- [ ] Scheduler Worker 部署成功
- [ ] Worker secrets 名称仍存在
- [ ] Supabase 仍连接生产项目
- [ ] `/api/runtime` 正常
- [ ] `/playground` 200
- [ ] 匿名 `/api/control/jobs` 401
- [ ] Scheduler `/health` 正常
- [ ] 完成一次登录以激活 Cron 用户上下文

## UI

- [ ] 桌面 `/jobs` 无横向溢出
- [ ] 手机 `/jobs` 四个筛选完整显示
- [ ] 行内岗位条件表单可保存并重新匹配
- [ ] `/applications` 桌面和手机可读
- [ ] 只显示必要操作，没有恢复旧版卡片墙和内部按钮
