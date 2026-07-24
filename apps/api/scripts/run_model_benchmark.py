from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.benchmark import run_benchmark
from app.schemas import BenchmarkRequest


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Career Copilot model benchmark suite.")
    parser.add_argument("--suite", default="internship-agent-smoke")
    parser.add_argument("--max-cases", type=int, default=4)
    parser.add_argument("--output", default="model_benchmark.json")
    args = parser.parse_args()

    result = run_benchmark(BenchmarkRequest(suite_name=args.suite, max_cases=args.max_cases))
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
