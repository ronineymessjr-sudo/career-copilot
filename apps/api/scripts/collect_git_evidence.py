from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.git_evidence import collect_git_evidence
from app.schemas import GitEvidenceRequest


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect verifiable Git/CI delivery evidence.")
    parser.add_argument("--repo", default=".")
    parser.add_argument("--base", default="HEAD~1")
    parser.add_argument("--head", default="HEAD")
    parser.add_argument("--junit", default="")
    parser.add_argument("--ci-run-url", default="")
    parser.add_argument("--project", default="Career Copilot V2")
    parser.add_argument("--task", default="Git/CI 自动证据采集")
    parser.add_argument("--output", default="engineering_evidence.json")
    args = parser.parse_args()

    result = collect_git_evidence(
        GitEvidenceRequest(
            repo_path=args.repo,
            base_ref=args.base,
            head_ref=args.head,
            junit_path=args.junit,
            ci_run_url=args.ci_run_url,
            project=args.project,
            task_name=args.task,
            agent_tool="GitHub Actions + Git",
        )
    )
    output = Path(args.output)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
