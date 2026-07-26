# Career Copilot V2

## AI Career Intelligence Agent Platform

Career Copilot 是一个面向中国在校生的证据驱动 AI 求职智能体平台。当前版本为 **Milestone 08.1 · 1.0.1**。

它不是自动海投脚本。系统负责公开岗位发现、JD 分析、混合评分、Career Vault 证据检索、简历适配、招呼语与邮件草稿、面试准备、投递复盘和 Agent Evaluation；登录招聘平台、验证码处理、最终发送、最终投递、面试接受和 Offer 接受始终由用户完成或明确确认。

## Portfolio Demo

公开演示页面：

```text
/playground
```

HR 或面试官可以粘贴一条 AI 实习 JD，查看：

- 在校实习与届别硬性过滤；
- 规则、证据和历史反馈组成的混合评分；
- 已匹配技能、缺口和风险；
- 推荐简历 Persona 与项目排序；
- 可复制但不会自动发送的个性化招呼语；
- Grounding 与引用安全说明。

公开 Demo 使用仓库中的固定示例证据，不读取私人 Career Vault。

## Architecture

```text
Public job sources / pasted JD
             │
             ▼
      LangGraph Supervisor
             │
   ┌─────────┼──────────┬─────────────┐
   ▼         ▼          ▼             ▼
Job Scout  JD Analyst  Resume Agent  Interview Agent
   │         │          │             │
   └─────────┴────┬─────┴─────────────┘
                  ▼
        Grounding / Evaluation
                  │
        Human approval checkpoint
                  │
       Supabase + PostgreSQL + pgvector
                  │
      Next.js / FastAPI / Cloudflare
```

## Core capabilities

### Multi-Agent job intelligence

- LangGraph Supervisor 与专用 Agent 节点；
- 用户级 Run、Message、Trace、Evaluation 审计；
- 只保存可展示的节点摘要和证据引用，不暴露隐藏推理；
- 日报与周报只生成建议，不执行外部动作。

### Hybrid job ranking

```text
final_score = 40% rule_score + 40% semantic_score + 20% history_score
```

硬性阻断包括：

- 正式岗、校招、提前批全职；
- 明确仅面向毕业生或排除2028届；
- 非实习岗位；
- 已过截止日期。

存在硬性阻断时，最终分数不会超过49。

### Career Vault RAG

- 文档分块、内容哈希、字符范围和来源溯源；
- PostgreSQL `pgvector` 与 HNSW；
- 可选 OpenAI Embeddings；无 Key 时明确回退为确定性词法/技能匹配；
- 检索结果默认是未核验材料；
- 只有人工批准后才能成为 `verified` Career Vault 证据。

### Resume Agent

支持四类版本：

1. **AI Agent研发版**：Career Copilot → Camera Market Strategy → PhotoAtelier；
2. **AI产品版**：PhotoAtelier → Career Copilot → Camera Market Strategy；
3. **AI解决方案版**：Career Copilot → PhotoAtelier → Camera Market Strategy；
4. **本地过渡版**：Camera Market Strategy → Career Copilot → PhotoAtelier。

简历生成合同：

- 只使用已核验且启用的证据；
- 不编造公司、指标、用户量或项目结果；
- 只在证据支持时量化；
- 草稿不等于批准，也不等于已投递。

### MCP-compatible tools

认证入口：

```text
POST /api/mcp
```

支持岗位搜索、JD 分析、岗位排序、证据检索、简历版本查询和简历草稿生成。邮件草稿与投递状态等高风险工具只返回 `approval_required`，不会直接执行。

### FastAPI portfolio endpoints

```text
POST /agent/analyze-job
POST /agent/generate-resume
POST /agent/evaluate
```

这些端点使用固定公开项目证据，适合本地演示和面试讲解，不访问用户私有数据。

## Agent Evaluation

确定性 Portfolio Fixture 当前验证：

| Metric | Result |
|---|---:|
| Recall@5 | 1.000 |
| Precision@5 | 1.000 |
| MRR | 1.000 |
| Citation Coverage | 1.000 |
| Unsupported Claims | 0 |

这些是单一受控 fixture 的回归结果，不代表外部数据集上的通用模型性能。完整说明见 [`docs/agent-evaluation-report.md`](docs/agent-evaluation-report.md)。

## Local Docker demo

```bash
docker compose up --build
```

服务：

- Web：`http://localhost:3000/playground`
- FastAPI：`http://localhost:8000/docs`
- PostgreSQL + pgvector：`localhost:5432`

Web Docker 构建需要联网安装 npm 依赖。生产环境仍以 Cloudflare Workers + Supabase 为主。

## Development

```bash
npm run test:m08.1
npm run evaluation:m08.1
npm run smoke:m08.1
node scripts/validate_frontend.mjs apps/web
python -m pytest apps/api/tests -q
python scripts/validate_cloudflare.py
```

联网环境完整门禁：

```bash
npm install --no-audit --no-fund
npm run check
npm --workspace apps/web run build
npm --workspace apps/web run cf:build
```

## Production safety boundary

- `automaticSubmission: false`
- `automaticEmailSend: false`
- `automaticInterviewAcceptance: false`
- `automaticOfferAcceptance: false`
- `automaticEvidencePromotion: false`
- `finalConfirmationRequired: true`

## Project structure

```text
apps/web          Next.js / OpenNext Cloudflare UI、Agent Runtime 与 MCP
apps/api          FastAPI 本地演示与工程 API
workers/scheduler Cloudflare 定时任务
supabase          PostgreSQL、pgvector、RLS 与迁移
scripts           测试、评测、Smoke、部署和生产 E2E
docs              架构、里程碑、评测和部署交接
```

## Deployment

1. 确认 Supabase 迁移 `0001–0008` 已应用；
2. 配置 Cloudflare 与 Supabase Secrets；
3. 可选配置 `OPENAI_API_KEY` 启用真实向量语义评分；
4. 推送 `main`，由 GitHub Actions 执行测试、构建和部署；
5. 验证 `/api/runtime` 返回 `1.0.1`；
6. 验证 `/playground` 可匿名打开，控制面接口仍要求登录。

完整步骤见 `DEPLOYMENT_HANDOFF_M08_1.md`。
