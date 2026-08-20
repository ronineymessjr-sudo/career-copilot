# Camera Market Strategy System：面试解释与参数手册

这份说明对应相机市场价格情报/策略系统。核心不是“抓到一个低价就下单”，而是把公开价格当线索，把有来源、有哈希、有人上传并通过校验的结算证据才提升为可触发策略的事实。

## 30 秒版本

系统用 FastAPI、SQLAlchemy、PostgreSQL/Supabase、Next.js 和 Cloudflare edge 组成单操作员价格情报平台。长任务进入 PostgreSQL 队列并用 `FOR UPDATE SKIP LOCKED` 领取；证据上传后保存 provenance 和 SHA-256。`VISIBLE_PRICE/UNVERIFIED/LEGACY_IMPORT` 只能作为线索，只有新鲜的 `VERIFIED_CHECKOUT`、可信上传证据和币种匹配时才允许产生策略信号。

## 关键参数：调什么、影响什么

| 参数 | 当前默认/规则 | 调大或放宽 | 调小或收紧 |
|---|---|---|---|
| `evidence_max_upload_bytes` | 10 MB | 能接收更大的订单/购物车截图或 PDF，但成本和攻击面增加 | 降低资源消耗，可能拒绝合法证据 |
| `crawler_concurrency` | 3 | 提高抓取吞吐，但会增加目标站压力、限流和失败率 | 降低压力，吞吐下降 |
| 平台并发 | `taobao:2,pdd:2,jd:4,generic:6` | 提高某平台吞吐；需要结合平台限流 | 收紧可降低封禁风险 |
| `crawler_timeout_ms` | 45,000 ms | 提高慢站成功率，但任务占用更久 | 更快失败并释放 worker，但可能误判慢站不可用 |
| `crawler_min_interval_minutes` | 120 分钟 | 降低重复抓取和供应商压力 | 更频繁刷新，但成本与限流风险上升 |
| `crawler_retries` | 1 | 暂时性网络失败更可能恢复，但重复调用增加 | 更快失败，减少重复请求 |
| 外部集成 timeout | 30 秒 | 允许供应商慢响应 | 更快失败，避免阻塞队列 |
| offer TTL | 12 小时 | 价格线索保留更久，但新鲜度风险增加 | 更强调新鲜数据 |
| 重操作限流 | 30 次 / 60 秒 | 提高吞吐但放大重复任务风险 | 更能抑制滥用，可能误伤批量操作 |
| DB pool | `pool_size=5,max_overflow=5,pool_timeout=10` | 提升并发连接能力，但数据库压力增加 | 限制资源，可能增加等待 |

## 信任状态与抑制/增强效果

- `VISIBLE_PRICE`：页面上看得到的价格，只增强“候选线索”召回，不增强可执行策略资格。
- `UNVERIFIED`：尚未核验，仍然只能展示和比较，不能触发信号。
- `LEGACY_IMPORT`：历史导入，需要重新验证，不能因为旧数据存在就自动触发。
- `VERIFIED_CHECKOUT`：必须关联上传的 CHECKOUT/CART/ORDER 证据；再检查 evidence hash、provenance、时间新鲜度和币种匹配，才进入策略触发路径。

因此，想增强发现召回可以扩大 crawler/来源，但想增强信号质量必须提高证据门槛，而不是把所有低价直接转成 signal。这个分离是系统最重要的 anti-false-positive 设计。

## 确定性和并发安全

1. 上传文件服务端计算 SHA-256，并记录对象路径、来源、上传者和证据类型；同一内容可以被审计和去重。
2. PostgreSQL 队列由 `FOR UPDATE SKIP LOCKED` 领取，多个 worker 不会同时处理同一条已领取任务。
3. API 返回 job id，前端轮询状态；长任务不阻塞 HTTP 请求。
4. 每个请求带 `X-Request-ID`，日志以 JSON 记录路径、状态和耗时，便于复盘。
5. 生产就绪不是“容器启动”这么简单：必须通过 readiness、真实证据到信号流程、每日后台任务和 zero-invalid-triggered-signals 检查。

这能保证状态转换、证据审计和队列领取是可复现的；第三方网页价格本身随时间变化，所以不能承诺外部数据永远相同。

## 不可用时怎么办

| 故障 | 系统动作 |
|---|---|
| 供应商 API 凭据缺失 | 适配器保持 disabled/失败闭环，不伪造导入结果；凭据只存在环境变量 |
| 爬虫超时或被限流 | 按 timeout/retries 结束本次任务，记录 source health，等待下一周期 |
| 数据库/队列不可用 | readiness 失败或任务保持未完成；不把前端旧数据标记为新鲜 |
| 证据缺少上传或 hash | 不允许 `VERIFIED_CHECKOUT` 进入策略触发 |
| 币种/时间不匹配 | 降级为线索或拒绝触发，并记录原因 |
| Cloudflare Access/Tunnel 不可用 | 私有操作面不可用，保留公开入口的安全边界；不绕过 Access |
| 本地开发 | SQLite 和 loopback auth bypass 仅用于本地开发/测试，不能复用为云端或公开运行时授权 |

## 高频追问与回答

**为什么不用最低价直接触发？**

最低价可能是券后价、地区价、缺货价或页面诱导价。系统把“看见的价格”和“已验证可结算价格”分成两个信任层，只有后者才能触发策略。

**如何抑制重复任务？**

数据库事务领取 + `SKIP LOCKED` 防并发重复消费，上传 hash 和幂等键防重复写入，前端用 job id 轮询而不是重复 POST。

**如何调 crawler 参数？**

先按来源健康、成功率、平均耗时和限流反馈分平台调并发/间隔，不以单次抓取数量为唯一目标；任何调大吞吐的改动都必须重新跑 cloud smoke 和信任检查。

**项目现在是否可以宣称生产完全上线？**

只有当真实凭据、域名、Access/Tunnel、Supabase/Postgres、证据到信号 E2E 和每日任务都通过时才能这么说。仓库的 readiness 文档把这些列为 release gate，不能用本地测试替代。

## 诚实边界

系统没有自动购买、支付、验证码绕过或秘密凭据前端暴露；官方适配器在缺凭据时保持关闭。面试中应把“已经实现的安全边界”和“仍需真实云凭据才能验证的生产 gate”分开。
