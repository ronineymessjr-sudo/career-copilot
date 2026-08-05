# 生产数据库部署说明

## 生产项目

- Supabase project ref：`woywgfoqurumrkyoznnb`
- 生产岗位、画像、简历、证据、投递记录和 Auth 用户必须保留。
- 已知生产迁移至少已执行至 0013。
- 本次完整平台新增：`0014_complete_platform_job_pool.sql`。

## 包内迁移文件

迁移编号允许跳号，必须按文件名排序处理：

```text
0001_core.sql
0002_engineering_evidence.sql
0003_supabase_runtime_ci_benchmarks.sql
0004_cloudflare_control_plane.sql
0005_discovery_exports_gmail.sql
0006_interview_learning_analytics.sql
0007_knowledge_graph_workflows.sql
0008_agent_runtime_mcp_evaluation.sql
0011_daily_application_queue.sql
0013_dispatch_policy_channel_alignment.sql
0014_complete_platform_job_pool.sql
```

0011 已补回完整源码包，保证全新环境的迁移链可复现。它在现有生产环境已经存在时不应被重复误操作。

## 正确流程

```bash
npx supabase link --project-ref woywgfoqurumrkyoznnb
npx supabase migration list
npx supabase db push --dry-run
```

只有在结果与生产历史一致、并且仅显示预期待部署迁移时，才能运行：

```bash
npx supabase db push
```

## 发生历史不一致时

停止部署并检查：

- 远端 schema 是否已经包含该改动
- `supabase_migrations.schema_migrations` 是否记录正确
- 是否曾经直接通过 SQL Editor 应用迁移

不得自动运行：

- `supabase db reset`
- `DROP SCHEMA`
- `DROP TABLE`
- 未审计的 `migration repair`
- 示例数据覆盖生产数据

## 0014 的数据影响

- 新增 public/private 岗位可见性。
- 新增每用户岗位核验覆盖表。
- 新增 shared/private 来源范围。
- 增加 Ashby provider。
- 已自动发现的 Greenhouse、Lever、Ashby 岗位进入共享岗位池。
- 既有岗位来源保持私有，必须由拥有者明确选择共享，避免泄露内部来源。
- 不删除岗位、投递、用户或证据数据。
