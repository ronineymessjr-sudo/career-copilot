import { AppShell } from "@/components/app-shell";
import { jobs } from "@/lib/mock-data";

export function DataPage({title,description,columns}:{title:string;description:string;columns:string[]}){
  return <AppShell><section className="content-page"><header className="content-page-header"><div><span className="eyebrow">Workspace Module</span><h2>{title}</h2><p style={{fontSize:10,color:"#8f9baa",margin:"6px 0 0"}}>{description}</p></div><button className="primary-button">新建记录</button></header><table className="data-table"><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{jobs.slice(0,5).map(job=><tr key={job.id}>{columns.map((col,i)=><td key={col}>{i===0?job.company:i===1?job.title:i===2?job.location:i===3?<span className="status-dot">{job.status}</span>:job.score}</td>)}</tr>)}</tbody></table></section></AppShell>
}
