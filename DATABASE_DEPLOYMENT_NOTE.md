# 数据库部署说明

本完整源码包面向 **现有生产环境的代码重新部署**。

## 当前生产项目

- Supabase project ref：`woywgfoqurumrkyoznnb`
- 生产数据、岗位、简历、证据和投递记录已经在线
- `0013_dispatch_policy_channel_alignment.sql` 已在生产环境应用

## 部署时应做

- 保持现有 Supabase 项目连接。
- 只部署 Web Worker 和 Scheduler Worker。
- 核对 Worker secrets 名称仍然存在。
- 不删除表、不清空数据、不重置 auth 用户。

## 部署时不要做

- 不运行 `DROP SCHEMA`、`DROP TABLE`、数据库 reset 或 destructive seed。
- 不新建一个空 Supabase 项目替换生产项目。
- 不把本地示例数据覆盖到生产数据。

## 新建数据库的特殊情况

当前包保留仓库中现有的迁移文件，但本次任务不是“从零迁移到新 Supabase”。若未来要迁移到全新数据库，应先从生产项目导出并审计完整 schema，再执行迁移演练；不要直接对生产环境试错。
