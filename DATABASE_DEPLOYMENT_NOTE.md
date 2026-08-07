# 数据库部署说明 — R4.0.2 即时画像聚合搜索

本次只新增：

```text
0022_instant_profile_aggregate_search.sql
```

新增两张用户私有表：

- `profile_search_runs`：保存一次点击触发的搜索条件、平台状态和统计。
- `profile_search_results`：保存该次搜索对应的岗位、排名、资格状态和材料准备结果。

迁移只新增表、索引、RLS、策略和授权，不会删除或覆盖现有画像、来源、岗位、简历、材料或投递记录。适配迁移 `0016`–`0021` 必须保留。

## 正确执行顺序

```bash
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

在已安装适配版 R4.0.1 / `2.0.1` 的环境中，dry-run 应只显示 `0022_instant_profile_aggregate_search.sql`。出现其他历史迁移时先核对远端迁移历史，禁止执行 reset。
