# Career Copilot V2 R4.0.2 Release

- Application version: `2.0.2`
- Release: `instant-profile-aggregate-search-2026.08.05`
- Base: deployment-adapted R4.0.1 / `2.0.1`
- Latest migration: `0022_instant_profile_aggregate_search.sql`
- Delivery target: incremental patch, Web Worker + database only

## 用户流程

```text
用户点击开始聚合搜索
→ 读取当前账号画像与补充关键词
→ 并行检查已连接 ATS 与公开招聘网页索引
→ 只接收真实岗位详情页或申请页
→ 写入当前用户私有岗位池
→ 跨来源去重、资格分析、画像评分
→ 展示每个平台状态与筛选结果
→ 为高匹配岗位选择最佳简历并生成完整文案
→ 用户确认并跳转真实投递页
```

## 安全与真实性

- 不保存招聘平台密码、Cookie 或验证码。
- 不绕过登录墙、验证码或反机器人机制。
- 不把搜索结果页或平台首页伪造成岗位详情。
- 不把打开投递页记录成已提交。
- 生成材料只使用已保存画像、简历和已核验证据。

## 部署适配

继续保留 `career_copilot` schema 路由、运行时 Supabase 配置、`.d.mts`、Scheduler `SUN` cron、OpenNext Linux 原生依赖、服务端 Gmail token，以及迁移 `0016`–`0021`。

## 发布门禁结果

- Node 业务测试：98 项通过
- Python API：14 项通过
- 合计：112 项通过，0 失败
- TypeScript/TSX：107 个文件语法解析通过
- 部署端适配审计：54 项通过
- Cloudflare 项目验证通过
- 完整包规则验证通过
- CSS 结构与全部 MJS 语法检查通过
- 离线 Smoke 通过

完整 TypeScript 类型检查与 OpenNext 构建仍由部署脚本在已安装依赖的部署机强制执行。
