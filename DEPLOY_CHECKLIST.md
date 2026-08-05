# Career Copilot Complete Platform R3 部署检查清单

## 数据库

- [ ] `supabase migration list` 已核对
- [ ] `supabase db push --dry-run` 只显示预期迁移
- [ ] 已应用 `0016_application_kits_one_click_handoff.sql`
- [ ] 未执行 reset、DROP TABLE 或 DROP SCHEMA
- [ ] 原用户、岗位、简历和投递记录仍存在

## 构建门禁

- [ ] `npm run test:complete` 全部通过
- [ ] `python -m pytest apps/api/tests -q` 全部通过
- [ ] `python scripts/validate_cloudflare.py`
- [ ] `python scripts/verify_complete_package.py`
- [ ] `npm run smoke:m08.1`
- [ ] Web 与 Scheduler TypeScript check
- [ ] OpenNext `cf:build`

## R3 功能验收

- [ ] `/api/runtime` 返回版本 `1.1.0`
- [ ] 运行今日推荐后生成个人推荐与完整投递包
- [ ] 选择岗位后自动选出最佳简历
- [ ] 可打开“定制简历 / 保存 PDF”
- [ ] 可下载原始简历
- [ ] 可打开完整材料包
- [ ] 可下载申请问答
- [ ] 招呼语、求职信、邮件和常见问答可复制
- [ ] 邮件岗位打开预填收件人、主题和正文
- [ ] 普通岗位打开真实申请页面
- [ ] 点击跳转后状态仍不是 `submitted`
- [ ] 用户确认外部提交后才记录为已投递

## 多用户与安全

- [ ] 两个账号拥有独立画像、简历、材料和投递记录
- [ ] 私有简历文件不可跨账号访问
- [ ] 未保存招聘平台密码、Cookie 或验证码
- [ ] 未绕过登录、验证码或反机器人机制
