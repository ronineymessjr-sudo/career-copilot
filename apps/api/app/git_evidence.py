from __future__ import annotations

import subprocess
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from .config import settings
from .repository import save_delivery_run
from .schemas import DeliveryRunInput, GitEvidenceRequest


class GitEvidenceError(RuntimeError):
    pass


@dataclass(frozen=True)
class TestEvidence:
    tests_run: int
    tests_passed: int
    failures: int
    errors: int
    skipped: int


def _run_git(repo: Path, *args: str) -> str:
    try:
        result = subprocess.run(
            ["git", "-C", str(repo), *args],
            check=True,
            capture_output=True,
            text=True,
            timeout=20,
        )
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError) as exc:
        detail = getattr(exc, "stderr", "") or str(exc)
        raise GitEvidenceError(f"Git command failed: {detail.strip()}") from exc
    return result.stdout.strip()


def _safe_repo_path(value: str) -> Path:
    root = settings.project_root.resolve()
    candidate = (root / value).resolve() if not Path(value).is_absolute() else Path(value).resolve()
    try:
        candidate.relative_to(root)
    except ValueError as exc:
        raise GitEvidenceError("repo_path must stay inside the Career Copilot project root") from exc
    if not (candidate / ".git").exists():
        raise GitEvidenceError(f"No .git directory found at {candidate}")
    return candidate


def parse_junit(path: Path | None) -> TestEvidence:
    if path is None or not path.exists():
        return TestEvidence(0, 0, 0, 0, 0)
    try:
        root = ET.parse(path).getroot()
    except (ET.ParseError, OSError) as exc:
        raise GitEvidenceError(f"Unable to parse JUnit XML: {exc}") from exc

    suites = [root] if root.tag == "testsuite" else list(root.iter("testsuite"))
    tests = sum(int(suite.attrib.get("tests", 0)) for suite in suites)
    failures = sum(int(suite.attrib.get("failures", 0)) for suite in suites)
    errors = sum(int(suite.attrib.get("errors", 0)) for suite in suites)
    skipped = sum(int(suite.attrib.get("skipped", 0)) for suite in suites)
    return TestEvidence(tests, max(tests - failures - errors, 0), failures, errors, skipped)


def collect_git_evidence(request: GitEvidenceRequest) -> dict:
    repo = _safe_repo_path(request.repo_path)
    head_sha = _run_git(repo, "rev-parse", request.head_ref)
    branch = _run_git(repo, "rev-parse", "--abbrev-ref", request.head_ref)
    numstat = _run_git(repo, "diff", "--numstat", request.base_ref, request.head_ref)

    files_changed = 0
    insertions = 0
    deletions = 0
    binary_files = 0
    for line in numstat.splitlines():
        if not line.strip():
            continue
        parts = line.split("\t", 2)
        if len(parts) < 3:
            continue
        files_changed += 1
        if parts[0] == "-" or parts[1] == "-":
            binary_files += 1
            continue
        insertions += int(parts[0])
        deletions += int(parts[1])

    commit_time_text = _run_git(repo, "show", "-s", "--format=%cI", request.head_ref)
    base_time_text = _run_git(repo, "show", "-s", "--format=%cI", request.base_ref)
    finished_at = datetime.fromisoformat(commit_time_text.replace("Z", "+00:00"))
    started_at = datetime.fromisoformat(base_time_text.replace("Z", "+00:00"))
    if started_at > finished_at:
        started_at = finished_at

    junit = None
    if request.junit_path:
        junit_candidate = (repo / request.junit_path).resolve()
        try:
            junit_candidate.relative_to(repo)
        except ValueError as exc:
            raise GitEvidenceError("junit_path must stay inside repo_path") from exc
        junit = junit_candidate
    test_evidence = parse_junit(junit)

    notes = (
        f"Automated Git diff evidence: {insertions} insertions, {deletions} deletions, "
        f"{binary_files} binary files. Git cannot determine AI-vs-human authorship, so "
        "ai_generated_lines and human_edited_lines are deliberately left at zero."
    )
    item = DeliveryRunInput(
        project=request.project,
        task_name=request.task_name,
        agent_tool=request.agent_tool,
        started_at=started_at,
        finished_at=finished_at,
        files_changed=files_changed,
        ai_generated_lines=0,
        human_edited_lines=0,
        tests_run=test_evidence.tests_run,
        tests_passed=test_evidence.tests_passed,
        acceptance_criteria_total=0,
        acceptance_criteria_met=0,
        notes=notes,
        source_ref=f"{request.base_ref}..{request.head_ref}",
        evidence_type="ci" if request.ci_run_url else "git",
        data_quality="automated",
        branch=branch,
        commit_sha=head_sha,
        ci_run_url=request.ci_run_url,
        insertions=insertions,
        deletions=deletions,
    )
    run_id = save_delivery_run(item)
    return {
        "run_id": run_id,
        "branch": branch,
        "commit_sha": head_sha,
        "files_changed": files_changed,
        "insertions": insertions,
        "deletions": deletions,
        "binary_files": binary_files,
        "tests_run": test_evidence.tests_run,
        "tests_passed": test_evidence.tests_passed,
        "failures": test_evidence.failures,
        "errors": test_evidence.errors,
        "skipped": test_evidence.skipped,
        "attribution": "unknown",
        "notes": notes,
        "delivery_run": item.model_dump(mode="json"),
    }
