from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass

import httpx

from .config import settings
from .repository import save_model_run
from .schemas import ModelGenerateInput


@dataclass(frozen=True)
class ModelResult:
    text: str
    provider: str
    model: str
    latency_ms: int


class ModelGatewayError(RuntimeError):
    pass


def _headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if settings.model_api_key:
        headers["Authorization"] = f"Bearer {settings.model_api_key}"
    return headers


def model_health() -> dict:
    provider = settings.model_provider
    started = time.perf_counter()
    if provider == "mock":
        return {
            "status": "healthy",
            "provider": provider,
            "model": settings.model_name,
            "endpoint": "local://mock",
            "latency_ms": 0,
            "external_request": False,
        }

    try:
        with httpx.Client(timeout=settings.model_timeout_seconds, headers=_headers()) as client:
            if provider == "ollama":
                response = client.get(f"{settings.model_base_url}/api/tags")
            elif provider in {"vllm", "openai-compatible"}:
                response = client.get(f"{settings.model_base_url}/v1/models")
            else:
                raise ModelGatewayError(f"Unsupported MODEL_PROVIDER: {provider}")
            response.raise_for_status()
    except (httpx.HTTPError, ModelGatewayError) as exc:
        return {
            "status": "unhealthy",
            "provider": provider,
            "model": settings.model_name,
            "endpoint": settings.model_base_url,
            "latency_ms": round((time.perf_counter() - started) * 1000),
            "external_request": True,
            "error": str(exc),
        }

    return {
        "status": "healthy",
        "provider": provider,
        "model": settings.model_name,
        "endpoint": settings.model_base_url,
        "latency_ms": round((time.perf_counter() - started) * 1000),
        "external_request": True,
    }


def generate_text(item: ModelGenerateInput) -> ModelResult:
    provider = settings.model_provider
    started = time.perf_counter()
    endpoint = "local://mock" if provider == "mock" else settings.model_base_url
    prompt_hash = hashlib.sha256(item.prompt.encode("utf-8")).hexdigest()[:16]
    output = ""
    error = ""
    success = False

    try:
        if provider == "mock":
            preview = " ".join(item.prompt.strip().split())[:160]
            output = f"[Mock model output] 已接收任务：{preview}"
        else:
            with httpx.Client(timeout=settings.model_timeout_seconds, headers=_headers()) as client:
                if provider == "ollama":
                    response = client.post(
                        f"{settings.model_base_url}/api/generate",
                        json={
                            "model": settings.model_name,
                            "prompt": item.prompt,
                            "system": item.system_prompt,
                            "stream": False,
                            "options": {"temperature": item.temperature, "num_predict": item.max_tokens},
                        },
                    )
                    response.raise_for_status()
                    output = str(response.json().get("response", ""))
                elif provider in {"vllm", "openai-compatible"}:
                    messages = []
                    if item.system_prompt:
                        messages.append({"role": "system", "content": item.system_prompt})
                    messages.append({"role": "user", "content": item.prompt})
                    response = client.post(
                        f"{settings.model_base_url}/v1/chat/completions",
                        json={
                            "model": settings.model_name,
                            "messages": messages,
                            "temperature": item.temperature,
                            "max_tokens": item.max_tokens,
                        },
                    )
                    response.raise_for_status()
                    output = str(response.json()["choices"][0]["message"]["content"])
                else:
                    raise ModelGatewayError(f"Unsupported MODEL_PROVIDER: {provider}")
        success = True
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ModelGatewayError) as exc:
        error = str(exc)
        raise ModelGatewayError(error) from exc
    finally:
        latency_ms = round((time.perf_counter() - started) * 1000)
        save_model_run(
            provider=provider,
            model_name=settings.model_name,
            endpoint=endpoint,
            prompt_hash=prompt_hash,
            input_chars=len(item.prompt),
            output_chars=len(output),
            latency_ms=latency_ms,
            success=success,
            error=error,
        )

    return ModelResult(text=output, provider=provider, model=settings.model_name, latency_ms=latency_ms)
