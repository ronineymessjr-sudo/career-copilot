# 数据库部署说明 — R3

本版新增：

```text
0016_application_kits_one_click_handoff.sql
```

它只执行增量修改：

- 为 `application_packages` 增加 `content_bundle`、`tailored_resume`、`submission_capability`、`prepared_at`；
- 为 `applications` 增加 `submission_mode`、`handoff_opened_at`、`last_submission_action`；
- 增加必要索引。

它不会删除表、清空数据或重置用户。

## 正确执行顺序

```bash
npx supabase link --project-ref <YOUR_PROJECT_REF>
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

从已安装 R2 升级时，dry-run 通常只应显示 `0016_application_kits_one_click_handoff.sql`。若还缺少旧迁移，先核对远端迁移历史，不得直接 reset。

## 禁止操作

```text
supabase db reset
DROP TABLE
DROP SCHEMA
清空生产数据
```
