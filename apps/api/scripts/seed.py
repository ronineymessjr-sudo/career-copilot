from __future__ import annotations

import json
from pathlib import Path

from app.profile import get_profile
from app.repository import upsert_job
from app.scoring import evaluate_job
from app.repository import save_evaluation
from app.schemas import JobInput


def main() -> None:
    path=Path(__file__).resolve().parents[1] / "data" / "seed_jobs.json"
    jobs=[JobInput.model_validate(item) for item in json.loads(path.read_text(encoding="utf-8"))]
    profile=get_profile()
    for job in jobs:
        job_id=upsert_job(job)
        save_evaluation(job_id,evaluate_job(job,profile))
    print(f"Seeded and evaluated {len(jobs)} jobs")


if __name__=="__main__":
    main()
