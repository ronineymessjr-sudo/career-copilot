# 生产数据库部署说明

## 生产项目

- Supabase project ref：`woywgfoqurumrkyoznnb`
- 生产岗位、画像、简历、证据、投递记录和 Auth 用户必须保留。
- 上一完整平台版新增了 `0014_complete_platform_job_pool.sql`。
- 本版新增 `0015_profile_resume_daily_recommendations.sql`。

## 0015 新增内容

- `profiles.profile_details`：完整个人画像。
- 多版本简历元数据、主简历约束和上传来源信息。
- 私有 Storage 桶 `resume-files`，支持 PDF、DOC、DOCX、TXT，单文件最大 10MB。
- `daily_recommendation_preferences`：每用户每日推荐设置。
- `daily_recommendations`：每用户每日推荐结果和自动准备记录。
- 所有个人数据继续使用 RLS 按账号隔离。

0015 在建立“每个画像只能有一份活动主简历”的约束前，会先保留最近更新的一份主简历，因此可安全升级已有多版本数据。

## 包内迁移顺序

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
0015_profile_resume_daily_recommendations.sql
```

编号允许跳号，必须按文件名排序处理。

## 正确升级流程

```bash
npx supabase link --project-ref woywgfoqurumrkyoznnb
npx supabase migration list
npx supabase db push --dry-run
```

若上一版已经安装，dry-run 通常只应显示 `0015_profile_resume_daily_recommendations.sql`。如果 0014 尚未应用，则可能显示 0014 和 0015。

确认结果与生产历史一致后才执行：

```bash
npx supabase db push
```

## 禁止操作

不得自动运行：

- `supabase db reset`
- `DROP SCHEMA`
- `DROP TABLE`
- 未审计的 `migration repair`
- 示例数据覆盖生产数据

迁移历史不一致时立即停止，先核对远端 schema 与 `supabase_migrations.schema_migrations`。
