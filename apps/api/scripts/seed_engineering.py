from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.db import init_db
from app.repository import save_delivery_run
from app.schemas import DeliveryRunInput


def main() -> None:
    init_db()
    start = datetime.now(timezone.utc) - timedelta(hours=2)
    item = DeliveryRunInput(
        project="Career Copilot V2",
        task_name="Milestone 02：模型网关与 AI Coding 证据",
        agent_tool="ChatGPT coding workflow",
        started_at=start,
        finished_at=datetime.now(timezone.utc),
        files_changed=14,
        ai_generated_lines=860,
        human_edited_lines=290,
        tests_run=6,
        tests_passed=6,
        acceptance_criteria_total=6,
        acceptance_criteria_met=6,
        notes="示例工程记录。上线前应改为由 Git diff、CI 和人工复盘真实采集。",
        source_ref="docs/MILESTONE_02.md",
    )
    run_id = save_delivery_run(item)
    print(f"Seeded engineering delivery run: {run_id}")


if __name__ == "__main__":
    main()
