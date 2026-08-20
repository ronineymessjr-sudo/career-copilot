# PhotoAtelier Agent Lab：面试解释与参数手册

这份说明对应摄影工作流 Agent 项目。仓库文档明确它是本地 Agent Lab/演示边界：有 FastAPI、LangGraph、LangChain、RAG、schema 与摄影规则校验和人工审批；不应说成已经接入真实飞书、Cloudflare 或生产账户。

## 30 秒版本

我没有把它做成不可控的多 Agent swarm，而是用 LangGraph 把请求规范化、检索、计划生成、结构校验、摄影规则校验、人工批准和本地写入做成显式状态图。模型不可用时，系统仍能用确定性的本地 fallback 产出可校验草稿；检索、重排和写入都保留状态，未通过审批的计划不会写入项目记录。

## 工作流与状态

`draft → retrieve → plan → validate → human_approval → commit_preview`。

状态至少包含 `run_id`、`project_id`、原始请求、规范化请求、上下文、检索轨迹、草案、schema 校验、摄影规则校验、审批状态、写入结果和 trace id。`approved` 之前只有草稿；批准后才创建本地 preview。重复批准不会重复创建实体，已批准版本不能原地重生成，必须新建 run/version。

## RAG 参数：调什么、影响什么

| 参数 | 当前默认/实现 | 调大或放宽 | 调小或收紧 |
|---|---|---|---|
| `chunk_size` | ProviderSettings 默认 700（当前代码按字符切分） | 上下文更完整、召回更宽，但噪声和 prompt 成本增加 | 片段更聚焦，但可能丢失跨句约束 |
| `chunk_overlap` | 默认 80 | 降低边界截断，增强跨片段召回；会增加重复和索引量 | 减少重复和成本，但边界信息可能断裂 |
| `retrieve_top_k` | 默认 8 | 提高召回，增加后续重排负担和噪声 | 提高精度/速度，可能漏掉关键规则 |
| `rerank_top_k` | 默认 4 | 给模型更多候选，可能提高覆盖；成本更高 | 输出更聚焦，但过小会漏证据 |
| 词法重排权重 | `0.65 * retrieval_score + 0.35 * overlap` | 提高 0.65 更相信初始检索；提高 0.35 更相信 query 与片段的词面重合 | 反向调整会改变“召回优先/词面优先”的平衡 |
| embedding 维度 | 默认 384；本地 SentenceTransformer 开启时以模型维度为准 | 更高维可能表达更多语义，但存储和计算增加 | 更低维更快，但语义区分能力可能下降 |
| `match_threshold`（Career Copilot 的 pgvector 函数） | SQL 默认 0.20；PhotoAtelier Lab 通过 provider 抽象，不硬编码同一阈值 | 提高阈值抑制弱相关片段 | 降低阈值增强召回，但必须配合重排和“资料不足”分支 |

设计文档的目标是 500–800 token 级片段；当前 ProviderSettings 的运行实现是 700 字符和 80 字符 overlap。面试时应主动说明这是“设计目标”和“当前实现单位”的差异，不能把字符数冒充 token 数。

## 模型与确定性

- `enable_local_models=false` 时，embedding 使用哈希 token/ngram 的 384 维确定性向量；同一输入会得到相同向量。
- Cross Encoder 未启用或运行失败时，使用词法重排；状态会标记 `degraded`，不会把 fallback 报告成 Cross Encoder 可用。
- 没有 `OPENAI_API_KEY` 时使用 `LocalFallbackChatModel`，输出固定结构的三镜头计划，并且通过 Pydantic `AgentPlan` 校验。
- 有 key 时才懒加载 `ChatOpenAI`，当前代码将 `temperature=0`；这降低随机性，但外部服务仍不是数学意义上的绝对确定。
- 每个 chunk 通过 source/title/index/content 的 SHA-256 生成稳定 id；检索结果保留 backend、score、snippet 和 trace id。

## 抑制什么、增强什么

- 想抑制幻觉：提高 `match_threshold`、减少 `rerank_top_k`、要求来源和 chunk_id、没有高分上下文就返回“资料不足”，并在写入前再次跑 schema/摄影规则校验。
- 想增强召回：增加 `retrieve_top_k`、合理提高 overlap、启用真实 embedding，但要用 Recall@K、MRR 和人工标注集验证，不能只看“返回更多片段”。
- 想抑制重复写入：以 `run_id + plan_version` 做幂等边界，批准前不写实体，重复 approval 只返回已有结果。
- 想增强可解释性：保留 `retrieval_trace`、source metadata、score、provider status 和 approval audit，而不是只保存最终文本。

## 不可用时怎么办

| 故障 | 降级策略 |
|---|---|
| OpenAI key 缺失 | 本地 deterministic fallback 生成结构化草稿；标记为本地预览，不宣称真实模型效果 |
| 本地 embedding 模型未安装 | 哈希 embedding；状态显示 fallback/degraded |
| Cross Encoder 加载失败 | 词法重排，保留检索分和 overlap 分 |
| PostgreSQL/pgvector/Milvus 不可用 | 使用 memory provider 或本地索引配置；若没有可信上下文则明确“资料不足” |
| 计划 JSON/规则校验失败 | 状态置为 failed，不进入 approval，不写入本地实体 |
| 人工未批准 | 保持 awaiting_approval；不发送外部消息、不写真实生产系统 |

## 高频追问与回答

**为什么用 LangGraph？**

因为审批是一个需要暂停/恢复的状态边界，LangGraph 能把状态、条件路由、恢复和测试显式化；这比把所有逻辑塞进一个 prompt 更容易审计。

**为什么不用多 Agent swarm？**

当前问题的关键是可恢复工作流和安全写入，而不是增加并发角色。先用单图验证状态契约、检索轨迹和审批规则，再基于瓶颈拆分节点。

**如何判断检索结果够不够？**

看 top-k 的 score、来源完整性、重排结果和“资料不足”分支；低分时不强行生成。离线评估用 Recall@K、Precision@K、MRR 和引用覆盖。

**如何保证确定性？**

本地 embedding、词法重排、chunk hash、Pydantic schema 和审批状态都是确定的；外部 LLM 只做到 `temperature=0` 和输入/版本约束，不能承诺绝对相同文本。

## 诚实边界

PhotoAtelier Agent Lab 目前证明的是本地可运行的 Agent、RAG、校验和审批闭环；没有证明真实飞书写入、生产 Cloudflare 执行、真实客户数据质量或模型训练效果。面试时把“可运行本地闭环”和“尚需外部凭据/部署”的边界说清楚。
