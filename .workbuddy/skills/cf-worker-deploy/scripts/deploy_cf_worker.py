#!/usr/bin/env python3
"""
Cloudflare Worker Deploy Script (cf-worker-deploy skill)

Downloads a pre-built worker artifact from a GitHub Actions run
and deploys it with wrangler via local OAuth.

Usage:
    python deploy_cf_worker.py <RUN_ID> [--project-dir <path>] [--workers-dir <path>] [--dry-run]

Arguments:
    RUN_ID        GitHub Actions run ID to download artifact from
    --project-dir Root of the monorepo/project (default: current directory)
    --workers-dir List of additional worker directories to deploy
    --dry-run     Download and verify but skip deploy

Example:
    python deploy_cf_worker.py 31171002767 --workers-dir workers/scheduler
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def run(cmd: list[str], cwd: str | None = None, check: bool = True) -> subprocess.CompletedProcess:
    """Run a command and print its output."""
    print(f"  $ {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    if check and result.returncode != 0:
        print(f"  ERROR: Command failed with exit code {result.returncode}")
        sys.exit(result.returncode)
    return result


def verify_gh_auth() -> None:
    """Verify GitHub CLI is authenticated."""
    print("[1/5] Checking GitHub CLI auth...")
    result = subprocess.run(["gh", "auth", "status"], capture_output=True, text=True)
    if "Logged in to github.com" not in result.stdout:
        print("  ERROR: gh CLI not authenticated. Run: gh auth login")
        sys.exit(1)
    print("  OK")


def verify_wrangler_auth() -> None:
    """Verify wrangler OAuth is active."""
    print("[2/5] Checking wrangler auth...")
    result = subprocess.run(
        ["npx", "wrangler", "whoami"],
        capture_output=True, text=True,
        timeout=30,
    )
    if "not authenticated" in result.stdout.lower() or result.returncode != 0:
        if "OAuth Token" in result.stdout:
            print("  OK (OAuth)")
            return
        print("  ERROR: wrangler not authenticated. Run: npx wrangler login")
        sys.exit(1)
    print("  OK")


def download_artifact(run_id: str, target_dir: Path) -> None:
    """Download worker-build artifact from GitHub Actions run."""
    print(f"[3/5] Downloading artifact 'worker-build' from run {run_id}...")

    if target_dir.exists():
        shutil.rmtree(target_dir, ignore_errors=True)
    target_dir.mkdir(parents=True, exist_ok=True)

    run(
        ["gh", "run", "download", run_id, "--name", "worker-build", "--dir", str(target_dir)],
    )

    # Verify key files exist
    required = [
        target_dir / ".open-next" / "worker.js",
        target_dir / ".next" / "BUILD_ID",
        target_dir / "wrangler.jsonc",
    ]
    for f in required:
        if not f.exists():
            print(f"  ERROR: Missing {f} in downloaded artifact")
            sys.exit(1)

    print(f"  Downloaded {sum(1 for _ in target_dir.rglob('*') if _.is_file())} files")


def deploy_worker(project_dir: Path, dry_run: bool = False) -> None:
    """Deploy the web worker."""
    print("[4/5] Deploying web worker...")

    web_dir = project_dir / "apps" / "web"
    if not web_dir.exists():
        # Try monorepo root as the web dir directly
        web_dir = project_dir

    artifact_dir = project_dir / "ci-artifact"

    # Copy artifact to web dir
    for src_name in [".open-next", ".next"]:
        src = artifact_dir / src_name
        dst = web_dir / src_name
        if dst.exists():
            shutil.rmtree(dst, ignore_errors=True)
        shutil.copytree(str(src), str(dst))

    # Copy wrangler.jsonc
    shutil.copy2(
        str(artifact_dir / "wrangler.jsonc"),
        str(web_dir / "wrangler.jsonc"),
    )

    if dry_run:
        print("  DRY RUN: skipping deploy")
        return

    run(["npx", "wrangler", "deploy"], cwd=str(web_dir))


def deploy_scheduler(project_dir: Path, scheduler_dir: str, dry_run: bool = False) -> None:
    """Deploy an additional worker (e.g., scheduler)."""
    sched_path = project_dir / scheduler_dir
    print(f"[5/5] Deploying {scheduler_dir} worker...")

    if not sched_path.exists():
        print(f"  WARNING: {scheduler_dir} not found, skipping")
        return

    if dry_run:
        print("  DRY RUN: skipping deploy")
        return

    run(["npx", "wrangler", "deploy"], cwd=str(sched_path))


def extract_worker_url(project_dir: Path) -> str | None:
    """Extract worker URL from wrangler.jsonc."""
    wrangler_config = project_dir / "ci-artifact" / "wrangler.jsonc"
    if not wrangler_config.exists():
        return None
    content = wrangler_config.read_text()
    for line in content.split("\n"):
        if '"name"' in line:
            name = line.split(":")[1].strip().strip('",').strip('"')
            return f"https://{name}.photomagic.workers.dev"
    return None


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Deploy Cloudflare Worker from CI artifact",
    )
    parser.add_argument("run_id", help="GitHub Actions run ID")
    parser.add_argument(
        "--project-dir",
        default=os.getcwd(),
        help="Root of the monorepo (default: current directory)",
    )
    parser.add_argument(
        "--workers-dir",
        nargs="*",
        default=["workers/scheduler"],
        help="Additional worker directories to deploy (default: workers/scheduler)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Download and verify but skip deploy",
    )
    args = parser.parse_args()

    project_dir = Path(args.project_dir).resolve()
    artifact_dir = project_dir / "ci-artifact"

    print(f"=== CF Worker Deploy ===")
    print(f"Project: {project_dir}")
    print(f"Run ID:  {args.run_id}")
    print()

    verify_gh_auth()
    verify_wrangler_auth()
    download_artifact(args.run_id, artifact_dir)
    deploy_worker(project_dir, dry_run=args.dry_run)

    for sched_dir in args.workers_dir:
        deploy_scheduler(project_dir, sched_dir, dry_run=args.dry_run)

    if not args.dry_run:
        url = extract_worker_url(project_dir)
        print()
        print("=== Deployment Complete ===")
        if url:
            print(f"Worker URL: {url}")
        print("Run smoke test to verify endpoints.")


if __name__ == "__main__":
    main()
