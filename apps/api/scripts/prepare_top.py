from __future__ import annotations

from app.repository import list_jobs
from app.workflow import prepare_job_record


def main() -> None:
    count=0
    for row in list_jobs():
        evaluation=row.get("evaluation") or {}
        if evaluation.get("eligible") and evaluation.get("grade") in {"S","A"}:
            prepare_job_record(row["id"])
            count += 1
    print(f"Prepared {count} application packages")


if __name__=="__main__":
    main()
