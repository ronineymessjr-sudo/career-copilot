import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** Shared presentation only: authentication and data fetching stay with each page. */
export function WorkspaceBrand({ href = "/" }: { href?: string }) {
  return <Link className="cc-brand" href={href} aria-label="Career Copilot 首页"><span aria-hidden="true">C</span><strong>Career Copilot</strong></Link>;
}

export function WorkspaceHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <header className="cc-heading"><div><h1>{title}</h1>{description ? <p>{description}</p> : null}</div>{action ? <div className="cc-heading-action">{action}</div> : null}</header>;
}

export function WorkspaceDisclosure({ title, description, children, id }: { title: string; description?: string; children: ReactNode; id?: string }) {
  return <details className="cc-disclosure" id={id}><summary><span><strong>{title}</strong>{description ? <small>{description}</small> : null}</span><ChevronDown size={18}/></summary><div className="cc-disclosure-body">{children}</div></details>;
}

export function WorkspaceState({ title, description, action, tone = "empty" }: { title: string; description: string; action?: ReactNode; tone?: "empty" | "error" | "loading" }) {
  return <div className={`cc-state cc-state-${tone}`} role={tone === "error" ? "alert" : "status"} aria-busy={tone === "loading"}><strong>{title}</strong><p>{description}</p>{action}</div>;
}
