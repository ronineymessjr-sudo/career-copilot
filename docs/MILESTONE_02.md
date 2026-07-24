# Milestone 02 — Engineering Evidence

Date: 2026-07-23

## Goal

把“使用 AI Coding”和“能够部署模型服务”从简历关键词，升级为可查询、可测试、可追溯的工程证据。

## Delivered

### 1. Local model gateway

- `GET /api/model/health`
- `POST /api/model/generate`
- `GET /api/model/metrics`
- 默认 `MODEL_PROVIDER=mock`，新环境不会产生外部模型请求
- 支持 `ollama`
- 支持 `vllm` / `openai-compatible`
- 记录 Provider、模型、端点、Prompt 哈希、输入输出字符数、延迟、成功状态与错误
- 不保存原始 Prompt，减少求职资料泄漏风险

### 2. AI Coding delivery ledger

- `POST /api/engineering/delivery-runs`
- `GET /api/engineering/delivery-runs`
- `GET /api/engineering/summary`
- 记录项目、任务、AI 工具、耗时、文件改动、AI 生成行、人工修改行、测试和验收标准
- 计算人工修改占比、测试通过率和验收完成率
- 明确区分演示数据与真实采集数据

### 3. Product surface

新增“工程证据”工作区：

- 模型服务状态
- Model Gateway 架构
- 成功率与延迟
- 人工质量闸门
- AI Coding 交付账本
- 首页工程证据入口

### 4. Database

- SQLite 本地表：`model_runs`、`delivery_runs`
- Supabase 迁移：`0002_engineering_evidence.sql`
- 为用户、时间、项目和成功状态添加索引
- Supabase 表启用 RLS

## Truthfulness rules

1. Mock 模式只能证明网关和观测链路可运行，不能描述为“已完成生产模型部署”。
2. AI 生成行数和人工修改行数必须来自 Git diff、编辑器记录或人工复盘，不允许凭感觉填写。
3. 简历可写“实现兼容 Ollama/vLLM 的模型网关”；只有实际连接模型并留存测试结果后，才写具体部署模型和性能数据。
4. 面试展示时同时展示失败记录和人工修改，避免把 AI Coding 包装成零人工开发。

## Next

- 使用 GitHub Actions 自动回填测试结果
- 从 Git diff 生成文件与行数统计
- 接入真实 Ollama 或 vLLM 实例并保存基准测试
- 将工程证据绑定到 Career Vault 和定制简历
