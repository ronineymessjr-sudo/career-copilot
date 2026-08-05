# Career Copilot Complete Platform R2 部署检查清单

## 数据库与 Auth

- [ ] 已阅读 `DATABASE_DEPLOYMENT_NOTE.md`
- [ ] `supabase migration list` 已核对
- [ ] `supabase db push --dry-run` 只显示预期迁移
- [ ] 已应用 `0015_profile_resume_daily_recommendations.sql`
- [ ] `resume-files` 桶存在且为 private
- [ ] 未运行 reset、DROP TABLE 或 DROP SCHEMA
- [ ] 生产岗位、用户和投递数据仍存在
- [ ] Supabase Site URL 指向生产 Worker
- [ ] Redirect URLs 包含生产域名
- [ ] Email 登录、注册验证和密码恢复可用

## 门禁

- [ ] `npm run test:complete`：72 项通过
- [ ] `python -m pytest apps/api/tests -q`：14 项通过
- [ ] `python scripts/validate_cloudflare.py`
- [ ] `python scripts/verify_complete_package.py`
- [ ] `npm run smoke:m08.1`
- [ ] Scheduler `cf-typegen`
- [ ] Web 与 Scheduler TypeScript check
- [ ] OpenNext `cf:build`

## 账号与画像

- [ ] `/login` 支持登录、注册和找回密码
- [ ] 登录后侧栏显示当前账号和退出登录
- [ ] 新账号不预填专业、毕业年份、岗位方向或地点
- [ ] `/profile` 可保存个人信息、简介、技能、教育、经历、项目、语言、证书和链接
- [ ] 刷新页面后完整画像仍存在

## 多版本简历

- [ ] `/resumes` 能上传 PDF/DOC/DOCX/TXT
- [ ] 上传文件存入私有 `resume-files`
- [ ] 能建立主简历
- [ ] 能保留至少两份不同方向版本
- [ ] 岗位定制版本不会覆盖主简历
- [ ] 原文件可下载、归档和删除
- [ ] 其他账号无法读取本账号文件

## 每日推荐与投递准备

- [ ] 首页显示“今日推荐”而不是静态优先岗位
- [ ] 手动运行今日推荐后写入当天记录
- [ ] Scheduler 每天 UTC+8 08:00 触发
- [ ] 每个账号得到独立排序
- [ ] 系统从已批准简历中自动选择最佳版本
- [ ] 画像不足、简历缺失或证据不足时明确提示
- [ ] 符合条件的岗位自动生成待批准材料包
- [ ] 批准后进入可以投递列表
- [ ] 最终外部提交仍由用户完成

## 多用户隔离

- [ ] 账号 A 与 B 均可看到 public 岗位
- [ ] 私有岗位、画像、简历、证据、推荐和投递记录互不可见
- [ ] 同一共享岗位可根据两个画像得到不同排序与简历匹配

## 部署与线上

- [ ] Web Worker 部署成功
- [ ] Scheduler Worker 部署成功
- [ ] Worker secrets 保留
- [ ] `/api/runtime` 返回新能力标记
- [ ] Scheduler `/health` 正常
- [ ] 桌面和手机界面可操作
