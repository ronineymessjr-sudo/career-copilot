# Architecture

```text
Sources / Email / Public pages
        ↓
Collector + Normalizer + Source Snapshot
        ↓
Eligibility Rules → Match Scoring → Career Evidence RAG
        ↓
Application Package Generator → Truth Check → Approval Gate
        ↓
Email Draft / Company Form Helper / Platform Manual Task
        ↓
Applications → Interviews → Offers → Analytics
```

## Monorepo
- `apps/web`: Next.js 产品工作台
- `apps/api`: FastAPI 业务 API 与本地 SQLite 开发模式
- `supabase`: PostgreSQL + pgvector 生产数据库
- `prototype`: 无依赖、可立即打开的产品演示
- `assets/resumes`: 三个真实简历版本

## 生产目标
- Web: Next.js
- API: FastAPI
- DB/Auth/Storage: Supabase
- Vector: pgvector
- Orchestration: LangGraph
- Scheduled jobs: Cloudflare Cron / OpenClaw
- Email: Gmail drafts with approval
- Observability: structured logs + LangSmith/OTel
