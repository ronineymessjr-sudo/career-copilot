import {
  Activity, Bot, CheckCircle2, Cloud, Code2, Database, FlaskConical,
  Gauge, GitBranch, GitPullRequest, Server, ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import type { EngineeringSummary } from "@/lib/api";
import { deliveryRuns, modelRuntime } from "@/lib/mock-data";

const metricIcons = [Server, Code2, GitBranch, CheckCircle2];

export function EngineeringDashboard({data}:{data:EngineeringSummary | null}) {
  const delivery = data?.delivery;
  const model = data?.model;
  const health = data?.model_health;
  const supabase = data?.supabase;
  const benchmark = data?.benchmarks?.[0];
  const live = Boolean(data);

  const metrics = [
    {label:"模型服务",value:health?.status === "healthy" ? "Healthy" : modelRuntime.provider === "mock" ? "Demo" : "Unknown",detail:`${health?.provider ?? modelRuntime.provider} · ${health?.model ?? modelRuntime.model}`},
    {label:"自动证据",value:String(delivery?.automated_runs ?? 0),detail:`Git +${delivery?.git_insertions ?? 0} / -${delivery?.git_deletions ?? 0}`},
    {label:"测试通过率",value:`${delivery?.test_pass_rate ?? 100}%`,detail:`${delivery?.tests_passed ?? 10} / ${delivery?.tests_run ?? 10} tests`},
    {label:"数据层",value:supabase?.reachable ? "Synced" : "Local",detail:supabase?.configured ? supabase.message : "SQLite safe mode"},
  ];

  const benchmarkStatus = benchmark
    ? benchmark.is_demo ? "Pipeline verified" : benchmark.comparable ? "Comparable" : "Incomplete"
    : "Not run";

  return (
    <AppShell>
      <section className="engineering-page">
        <header className="engineering-hero">
          <div>
            <span className="eyebrow">Engineering Evidence</span>
            <h2>让每一条工程能力都有可追溯证据</h2>
            <p>统一展示数据同步、模型服务、Git/CI 变更、测试结果和模型基准。系统不会把 Mock 流程验证或 Git 变更量包装成真实模型质量与 AI 代码占比。</p>
          </div>
          <div className={live ? "runtime-state" : "runtime-state runtime-demo"}>
            <span className="runtime-pulse" />
            <div><strong>{live ? "API Evidence Connected" : "Demo fallback active"}</strong><small>{health?.provider ?? "mock"} · {supabase?.mode ?? "sqlite"}</small></div>
          </div>
        </header>

        <div className="engineering-metrics">
          {metrics.map((metric, index) => {
            const Icon = metricIcons[index];
            return <article key={metric.label} className="engineering-metric">
              <div className="engineering-icon"><Icon size={16}/></div>
              <span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small>
            </article>;
          })}
        </div>

        <div className="evidence-integrations">
          <article className="integration-card">
            <div className="integration-icon"><Database size={18}/></div>
            <div><span>Supabase Data Layer</span><strong>{supabase?.reachable ? "Data API reachable" : supabase?.configured ? "Configured · offline" : "Not configured"}</strong><small>{supabase?.message ?? "本地 SQLite 保持为安全数据源；部署后可启用双写同步。"}</small></div>
            <i className={supabase?.reachable ? "signal online" : "signal"}/>
          </article>
          <article className="integration-card">
            <div className="integration-icon"><GitBranch size={18}/></div>
            <div><span>Git / CI Evidence</span><strong>{delivery?.automated_runs ?? 0} automated records</strong><small>记录 commit、branch、diff、JUnit 与 CI URL；代码作者归属保持 unknown。</small></div>
            <i className={(delivery?.automated_runs ?? 0) > 0 ? "signal online" : "signal"}/>
          </article>
          <article className="integration-card">
            <div className="integration-icon"><FlaskConical size={18}/></div>
            <div><span>Model Benchmark</span><strong>{benchmarkStatus}</strong><small>{benchmark?.notes ?? "尚未运行真实 Ollama/vLLM 基准；Mock 只验证管道。"}</small></div>
            <i className={benchmark?.comparable ? "signal online" : "signal"}/>
          </article>
        </div>

        <div className="engineering-grid">
          <article className="engineering-panel runtime-panel">
            <div className="panel-title"><div><span className="eyebrow">Model Runtime</span><h3>本地模型服务</h3></div><ShieldCheck size={19}/></div>
            <div className="runtime-diagram">
              <div><Bot size={17}/><span>Career Copilot</span></div>
              <i />
              <div><Activity size={17}/><span>Model Gateway</span></div>
              <i />
              <div><Server size={17}/><span>Ollama / vLLM</span></div>
            </div>
            <dl className="runtime-details">
              <div><dt>Provider</dt><dd>{health?.provider ?? modelRuntime.provider}</dd></div>
              <div><dt>Endpoint</dt><dd>{health?.endpoint ?? modelRuntime.endpoint}</dd></div>
              <div><dt>Success rate</dt><dd>{model ? `${model.success_rate}%` : modelRuntime.successRate}</dd></div>
              <div><dt>Average latency</dt><dd>{model ? `${model.average_latency_ms} ms` : modelRuntime.averageLatency}</dd></div>
              <div><dt>External request</dt><dd>{health?.external_request ? "Yes" : "No"}</dd></div>
            </dl>
            <p className="evidence-note">默认 Mock 模式不会请求外部模型。只有配置 Provider 后运行的非 Mock 基准，才可作为模型性能对比证据。</p>
          </article>

          <article className="engineering-panel quality-panel">
            <div className="panel-title"><div><span className="eyebrow">Quality Gate</span><h3>人工保险栓</h3></div><Gauge size={19}/></div>
            <div className="quality-bars">
              <div><span>测试通过率</span><strong>{delivery?.test_pass_rate ?? 100}%</strong><i><b style={{width:`${delivery?.test_pass_rate ?? 100}%`}}/></i></div>
              <div><span>验收标准完成率</span><strong>{delivery?.acceptance_rate ?? 100}%</strong><i><b style={{width:`${delivery?.acceptance_rate ?? 100}%`}}/></i></div>
              <div><span>人工修改占比</span><strong>{delivery?.human_edit_share ?? 25.7}%</strong><i><b style={{width:`${delivery?.human_edit_share ?? 25.7}%`}}/></i></div>
            </div>
            <ul className="quality-list">
              <li><CheckCircle2 size={14}/>服务密钥只保留在后端，前端不接触敏感凭证。</li>
              <li><CheckCircle2 size={14}/>Git 只能证明变更量，不推断 AI 与人工作者占比。</li>
              <li><CheckCircle2 size={14}/>Mock 基准明确标记为不可比较的管道验证。</li>
            </ul>
          </article>
        </div>

        <section className="benchmark-section">
          <header><div><span className="eyebrow">Benchmark Ledger</span><h3>模型基准记录</h3></div><button className="ghost-button"><Cloud size={15}/>连接本地模型后运行</button></header>
          <div className="benchmark-grid">
            <div><span>Suite</span><strong>{benchmark?.suite_name ?? "internship-agent-smoke"}</strong></div>
            <div><span>Provider</span><strong>{benchmark?.provider ?? "mock"}</strong></div>
            <div><span>Cases</span><strong>{benchmark ? `${benchmark.cases_succeeded}/${benchmark.cases_total}` : "0/0"}</strong></div>
            <div><span>P95 latency</span><strong>{benchmark ? `${benchmark.p95_latency_ms} ms` : "—"}</strong></div>
            <div><span>Semantic pass</span><strong>{benchmark?.semantic_pass_rate == null ? "Not comparable" : `${benchmark.semantic_pass_rate}%`}</strong></div>
          </div>
        </section>

        <section className="delivery-section">
          <header><div><span className="eyebrow">Delivery Ledger</span><h3>AI Coding 交付账本</h3></div><button className="primary-button"><GitPullRequest size={15}/>记录本次交付</button></header>
          <div className="delivery-table-wrap"><table className="data-table delivery-table"><thead><tr><th>项目 / 任务</th><th>工具</th><th>耗时</th><th>文件</th><th>测试</th><th>验收</th><th>人工修改</th><th>状态</th></tr></thead><tbody>
            {deliveryRuns.map(run=><tr key={run.id}><td><strong>{run.project}</strong><small>{run.task}</small></td><td>{run.tool}</td><td>{run.duration}</td><td>{run.filesChanged}</td><td>{run.tests}</td><td>{run.acceptance}</td><td>{run.humanEditShare}</td><td><span className={run.status==="已验证"?"status verified":"status pending"}>{run.status}</span></td></tr>)}
          </tbody></table></div>
          <p className="evidence-note">页面回退数据用于展示布局。连接 API 后，真实记录来自人工表单、Git diff、JUnit 和 GitHub Actions artifact。</p>
        </section>
      </section>
    </AppShell>
  );
}
