from __future__ import annotations

from .schemas import CandidateProfile, Evidence


def get_profile() -> CandidateProfile:
    return CandidateProfile(
        skills=[
            "Python", "FastAPI", "JavaScript", "TypeScript", "React", "Next.js",
            "PostgreSQL", "SQL", "Supabase", "Docker", "GitHub Actions", "Cloudflare",
            "LangChain", "LangGraph", "RAG", "Prompt", "Tool Calling", "Figma", "PRD",
            "Ollama", "vLLM", "OpenAI-compatible API", "AI Coding", "Model Observability",
        ],
        projects=[
            "Camera Market Strategy System",
            "PhotoAtelier",
            "个人知识与 AI 工作流系统",
            "LangChain / LangGraph / RAG 销量分析项目",
            "Career Copilot V2 工程证据系统",
        ],
        evidence=[
            Evidence(skill="FastAPI", project="Camera Market Strategy System", evidence="实现 REST API、健康检查、异步任务与结构化错误处理。"),
            Evidence(skill="PostgreSQL", project="Camera Market Strategy System", evidence="使用 PostgreSQL/Supabase 设计业务数据模型与查询接口。"),
            Evidence(skill="Docker", project="Camera Market Strategy System", evidence="使用 Docker 与 GHCR 进行容器化构建和交付。"),
            Evidence(skill="Next.js", project="Camera Market Strategy System", evidence="使用 Next.js 构建数据分析与策略展示前端。"),
            Evidence(skill="产品设计", project="PhotoAtelier", evidence="完成摄影工作流、领域模型、页面流程和测试设计。"),
            Evidence(skill="Figma", project="PhotoAtelier", evidence="具备产品界面、交互流程和演示材料设计能力。"),
            Evidence(skill="LangGraph", project="LangChain / LangGraph / RAG 销量分析项目", evidence="实现状态管理、条件分支和多节点工作流。"),
            Evidence(skill="RAG", project="LangChain / LangGraph / RAG 销量分析项目", evidence="使用中文 Embedding、Chroma、来源引用完成检索增强问答。"),
            Evidence(skill="Prompt", project="个人知识与 AI 工作流系统", evidence="围绕飞书与 Obsidian 设计结构化知识工作流。"),
            Evidence(skill="Cloudflare", project="Camera Market Strategy System", evidence="使用 Cloudflare 处理域名、边缘访问与部署流程。"),
            Evidence(skill="OpenAI-compatible API", project="Career Copilot V2 工程证据系统", evidence="实现兼容 Ollama/vLLM 的模型网关，提供健康检查、生成接口与延迟/成功率指标记录。"),
            Evidence(skill="AI Coding", project="Career Copilot V2 工程证据系统", evidence="实现 AI Coding 交付记录，跟踪人工修改、测试通过率和验收标准完成率。"),
        ],
    )
