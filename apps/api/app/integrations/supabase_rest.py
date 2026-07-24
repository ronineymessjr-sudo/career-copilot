from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

from ..config import settings


class SupabaseConfigurationError(RuntimeError):
    pass


class SupabaseRequestError(RuntimeError):
    pass


@dataclass(frozen=True)
class SupabaseHealth:
    configured: bool
    reachable: bool
    mode: str
    endpoint: str
    message: str


class SupabaseRestClient:
    """Small PostgREST client used by the backend-only synchronization bridge.

    The key is never exposed to the browser. Production deployments should use a
    dedicated backend secret and always include ``user_id`` in synchronized rows.
    """

    def __init__(
        self,
        *,
        base_url: str | None = None,
        api_key: str | None = None,
        access_token: str | None = None,
        user_id: str | None = None,
        timeout: float | None = None,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.base_url = (base_url if base_url is not None else settings.supabase_url).rstrip("/")
        self.api_key = api_key if api_key is not None else settings.supabase_key
        self.access_token = access_token if access_token is not None else settings.supabase_access_token
        self.user_id = user_id if user_id is not None else settings.supabase_user_id
        self.timeout = timeout if timeout is not None else settings.supabase_timeout_seconds
        self.transport = transport

    @property
    def configured(self) -> bool:
        return bool(self.base_url and self.api_key and self.user_id)

    def _headers(self, prefer: str | None = None) -> dict[str, str]:
        if not self.api_key:
            raise SupabaseConfigurationError("SUPABASE_KEY is not configured")
        headers = {
            "apikey": self.api_key,
            "Authorization": f"Bearer {self.access_token or self.api_key}",
            "Content-Type": "application/json",
        }
        if prefer:
            headers["Prefer"] = prefer
        return headers

    def _url(self, table: str) -> str:
        if not self.base_url:
            raise SupabaseConfigurationError("SUPABASE_URL is not configured")
        return f"{self.base_url}/rest/v1/{table}"

    def health(self) -> SupabaseHealth:
        if not self.configured:
            return SupabaseHealth(
                configured=False,
                reachable=False,
                mode=settings.data_backend,
                endpoint=self.base_url or "not-configured",
                message="Supabase credentials are not configured; SQLite remains active.",
            )
        try:
            with httpx.Client(timeout=self.timeout, transport=self.transport) as client:
                response = client.get(
                    self._url("jobs"),
                    headers=self._headers(),
                    params={"select": "id", "limit": "1"},
                )
                response.raise_for_status()
        except httpx.HTTPError as exc:
            return SupabaseHealth(
                configured=True,
                reachable=False,
                mode=settings.data_backend,
                endpoint=self.base_url,
                message=str(exc),
            )
        return SupabaseHealth(
            configured=True,
            reachable=True,
            mode=settings.data_backend,
            endpoint=self.base_url,
            message="Supabase Data API is reachable.",
        )

    def upsert(
        self,
        table: str,
        rows: list[dict[str, Any]],
        *,
        on_conflict: str,
        return_rows: bool = False,
    ) -> list[dict[str, Any]]:
        if not rows:
            return []
        if not self.user_id:
            raise SupabaseConfigurationError("SUPABASE_USER_ID is not configured")
        payload = []
        for row in rows:
            item = dict(row)
            item.setdefault("user_id", self.user_id)
            payload.append(item)
        prefer = "resolution=merge-duplicates,return=representation" if return_rows else "resolution=merge-duplicates,return=minimal"
        try:
            with httpx.Client(timeout=self.timeout, transport=self.transport) as client:
                response = client.post(
                    self._url(table),
                    headers=self._headers(prefer),
                    params={"on_conflict": on_conflict},
                    json=payload,
                )
                response.raise_for_status()
                if return_rows and response.content:
                    data = response.json()
                    return data if isinstance(data, list) else [data]
                return []
        except httpx.HTTPError as exc:
            body = ""
            if "response" in locals():
                body = response.text[:500]
            raise SupabaseRequestError(f"Supabase upsert failed for {table}: {exc}; {body}") from exc
