#!/usr/bin/env python3
"""
Career Copilot 监控脚本 — 检查项目各端点状态
Usage: python monitor_status.py [--json]
"""
import json
import os
import subprocess
import sys
import urllib.request
import urllib.error
from datetime import datetime


def check_web_app():
    """Check Career Copilot web app health"""
    url = "https://career-copilot-v2.photomagic.workers.dev/api/runtime"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "career-copilot-monitor"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            return {
                "status": "online",
                "version": data.get("version"),
                "mode": data.get("mode"),
                "features": sum(1 for k, v in data.items() if v is True),
            }
    except Exception as e:
        return {"status": "offline", "error": str(e)}


def check_queue_endpoints():
    """Check queue API endpoints"""
    base = "https://career-copilot-v2.photomagic.workers.dev/api/queue"
    endpoints = ["submit", "poll", "result", "consume"]
    results = {}
    for ep in endpoints:
        url = f"{base}/{ep}"
        try:
            if ep in ("submit", "consume"):
                req = urllib.request.Request(
                    url,
                    method="POST",
                    headers={"Content-Type": "application/json"},
                    data=json.dumps({}).encode(),
                )
            else:
                req = urllib.request.Request(url)
            try:
                urllib.request.urlopen(req, timeout=5)
                results[ep] = 200
            except urllib.error.HTTPError as e:
                results[ep] = e.code  # 401 = needs auth (good), 404 = missing (bad)
        except Exception as e:
            results[ep] = f"error: {e}"
    return results


def check_github_stats(cwd):
    """Check GitHub repo stats via gh CLI"""
    stats = {"stars": 0, "forks": 0, "clones_total": 0, "clones_unique": 0}
    try:
        result = subprocess.run(
            ["gh", "repo", "view", "--json", "stargazerCount,forkCount,description,url"],
            capture_output=True, text=True, cwd=cwd, timeout=10
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            stats["stars"] = data.get("stargazerCount", 0)
            stats["forks"] = data.get("forkCount", 0)
            stats["url"] = data.get("url")
    except Exception as e:
        stats["error"] = str(e)

    try:
        result = subprocess.run(
            ["gh", "api", "repos/ronineymessjr-sudo/public-apis-resource/traffic/clones"],
            capture_output=True, text=True, cwd=cwd, timeout=10
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            stats["clones_total"] = data.get("count", 0)
            stats["clones_unique"] = data.get("uniques", 0)
    except Exception:
        pass

    return stats


def check_workbuddy_expert():
    """Check WorkBuddy expert registration status"""
    expert_path = os.path.expanduser(
        "~/.workbuddy/plugins/marketplaces/my-experts/plugins/career-copilot"
    )
    plugin_json = os.path.join(expert_path, ".codebuddy-plugin", "plugin.json")
    avatar_path = os.path.join(expert_path, "avatars", "expert.png")

    result = {
        "path": expert_path,
        "exists": os.path.isdir(expert_path),
        "plugin_json": os.path.isfile(plugin_json),
        "avatar": os.path.isfile(avatar_path),
    }

    if os.path.isfile(plugin_json):
        with open(plugin_json, "r", encoding="utf-8") as f:
            pj = json.load(f)
            result["version"] = pj.get("version")
            result["name"] = pj.get("name")
            result["display_name_zh"] = pj.get("displayName", {}).get("zh")
            result["category"] = pj.get("categoryId")

    # Check marketplace registration
    marketplace_path = os.path.expanduser(
        "~/.workbuddy/plugins/marketplaces/my-experts/.codebuddy-plugin/marketplace.json"
    )
    if os.path.isfile(marketplace_path):
        with open(marketplace_path, "r", encoding="utf-8") as f:
            mp = json.load(f)
            plugins = mp.get("plugins", [])
            result["registered"] = any(p.get("name") == "career-copilot" for p in plugins)

    # Check known marketplaces
    known_path = os.path.expanduser("~/.workbuddy/plugins/known_marketplaces.json")
    if os.path.isfile(known_path):
        with open(known_path, "r", encoding="utf-8") as f:
            km = json.load(f)
            result["marketplace_known"] = "my-experts" in km

    return result


def check_workbuddy_sessions():
    """Check WorkBuddy session database for career-copilot usage"""
    import sqlite3
    db_path = os.path.expanduser("~/.workbuddy/workbuddy.db")
    if not os.path.isfile(db_path):
        return {"error": "workbuddy.db not found"}

    db = sqlite3.connect(db_path)
    cursor = db.cursor()

    # Career copilot sessions
    rows = cursor.execute(
        "SELECT COUNT(*) FROM sessions WHERE expert_id LIKE '%career%' OR expert_id LIKE '%copilot%'"
    ).fetchone()
    cc_sessions = rows[0] if rows else 0

    # All expert sessions
    all_experts = cursor.execute(
        "SELECT expert_id, COUNT(*) as cnt FROM sessions WHERE expert_id IS NOT NULL GROUP BY expert_id ORDER BY cnt DESC"
    ).fetchall()

    db.close()
    return {
        "career_copilot_sessions": cc_sessions,
        "all_expert_usage": [{"expert": r[0], "sessions": r[1]} for r in all_experts],
    }


def main():
    cwd = os.getcwd()

    report = {
        "timestamp": datetime.now().isoformat(),
        "web_app": check_web_app(),
        "queue_endpoints": check_queue_endpoints(),
        "github": check_github_stats(cwd),
        "workbuddy_expert": check_workbuddy_expert(),
        "workbuddy_sessions": check_workbuddy_sessions(),
    }

    # Print summary
    print(f"=== Career Copilot Status Report ===")
    print(f"Time: {report['timestamp']}")
    print()

    wa = report["web_app"]
    print(f"Web App: {wa['status']} | v{wa.get('version', '?')} | mode={wa.get('mode', '?')}")
    if wa["status"] == "online":
        print(f"  Features enabled: {wa.get('features', 0)}")

    print()
    print(f"Queue Endpoints:")
    for ep, code in report["queue_endpoints"].items():
        status = "OK (needs auth)" if code == 401 else f"HTTP {code}"
        print(f"  /api/queue/{ep}: {status}")

    print()
    gh = report["github"]
    print(f"GitHub: stars={gh.get('stars', 0)} forks={gh.get('forks', 0)}")
    if "clones_total" in gh:
        print(f"  Clones: {gh['clones_total']} total ({gh['clones_unique']} unique)")

    print()
    we = report["workbuddy_expert"]
    print(f"WorkBuddy Expert:")
    print(f"  Registered: {we.get('registered', False)}")
    print(f"  Marketplace known: {we.get('marketplace_known', False)}")
    print(f"  Version: {we.get('version', '?')}")
    print(f"  Display: {we.get('display_name_zh', '?')}")

    print()
    ws = report["workbuddy_sessions"]
    print(f"WorkBuddy Sessions: {ws.get('career_copilot_sessions', 0)} career-copilot sessions")
    for e in ws.get("all_expert_usage", []):
        print(f"  {e['expert']}: {e['sessions']} sessions")

    if "--json" in sys.argv:
        print()
        print(json.dumps(report, indent=2, ensure_ascii=False))

    return report


if __name__ == "__main__":
    main()
