from __future__ import annotations

import math
from statistics import mean

from .config import settings
from .model_runtime import ModelGatewayError, generate_text
from .repository import save_benchmark_run
from .schemas import BenchmarkRequest, ModelGenerateInput


BENCHMARK_CASES = [
    {
        "id": "structured-match",
        "prompt": "请用三行输出：岗位匹配等级、两项匹配技能、一项风险。岗位要求 FastAPI、RAG、Docker。",
        "required_terms": ["FastAPI", "RAG", "Docker"],
    },
    {
        "id": "truth-boundary",
        "prompt": "候选人只做过 LangGraph 基础 Demo。写一句不夸大的简历表述，必须包含‘基础’或‘Demo’。",
        "required_terms": ["基础", "Demo"],
    },
    {
        "id": "follow-up",
        "prompt": "生成一条不超过80字的实习投递跟进消息，语气礼貌，不要催促。",
        "required_terms": [],
    },
    {
        "id": "filtering",
        "prompt": "判断岗位是否适合2028届在校实习：职位是正式校招全职。只输出‘不适合’并给一个原因。",
        "required_terms": ["不适合"],
    },
]


def _p95(values: list[int]) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = max(0, math.ceil(len(ordered) * 0.95) - 1)
    return float(ordered[index])


def run_benchmark(request: BenchmarkRequest) -> dict:
    cases = BENCHMARK_CASES[: request.max_cases]
    results = []
    latencies: list[int] = []
    successes = 0
    semantic_passes = 0

    for case in cases:
        try:
            output = generate_text(
                ModelGenerateInput(
                    prompt=case["prompt"],
                    system_prompt="你是求职材料质量验证器。不得虚构候选人经历。",
                    temperature=0.0,
                    max_tokens=256,
                )
            )
            success = bool(output.text.strip())
            semantic_pass = all(term.lower() in output.text.lower() for term in case["required_terms"])
            latencies.append(output.latency_ms)
            successes += int(success)
            semantic_passes += int(semantic_pass)
            results.append({
                "case_id": case["id"],
                "success": success,
                "semantic_pass": semantic_pass,
                "latency_ms": output.latency_ms,
                "output_preview": output.text[:240],
                "error": None,
            })
        except ModelGatewayError as exc:
            results.append({
                "case_id": case["id"],
                "success": False,
                "semantic_pass": False,
                "latency_ms": 0,
                "output_preview": "",
                "error": str(exc),
            })

    is_demo = settings.model_provider == "mock"
    comparable = not is_demo and successes == len(cases)
    semantic_pass_rate = None if is_demo else round(semantic_passes / len(cases) * 100, 1)
    result = {
        "provider": settings.model_provider,
        "model_name": settings.model_name,
        "suite_name": request.suite_name,
        "is_demo": is_demo,
        "comparable": comparable,
        "cases_total": len(cases),
        "cases_succeeded": successes,
        "average_latency_ms": round(mean(latencies), 1) if latencies else 0.0,
        "p95_latency_ms": round(_p95(latencies), 1),
        "semantic_pass_rate": semantic_pass_rate,
        "notes": (
            "Mock provider validates the benchmark pipeline only; it is not a model-quality result."
            if is_demo
            else "Comparable only when all cases completed against the configured external model."
        ),
        "cases": results,
    }
    result["benchmark_id"] = save_benchmark_run(result)
    return result
