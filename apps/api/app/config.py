from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import os


@dataclass(frozen=True)
class Settings:
    # config.py lives at <project>/apps/api/app/config.py; parents[2] is the
    # repository root in both the checkout and the API Docker image.
    project_root: Path = Path(__file__).resolve().parents[2]
    database_path: Path = Path(
        os.getenv(
            "CAREER_COPILOT_DB",
            Path(__file__).resolve().parents[1] / "data" / "career_copilot.db",
        )
    )
    prototype_dir: Path = Path(__file__).resolve().parents[2] / "prototype"
    resume_dir: Path = Path(__file__).resolve().parents[2] / "assets" / "resumes"
    approval_first: bool = os.getenv("APPROVAL_FIRST", "true").lower() == "true"

    # Supabase Data API bridge. SQLite remains the safe local source of truth;
    # when DATA_BACKEND=dual, verified local records can be synchronized to Supabase.
    data_backend: str = os.getenv("DATA_BACKEND", "sqlite").strip().lower()
    supabase_url: str = os.getenv("SUPABASE_URL", "").rstrip("/")
    supabase_key: str = os.getenv("SUPABASE_KEY", "")
    supabase_access_token: str = os.getenv("SUPABASE_ACCESS_TOKEN", "")
    supabase_user_id: str = os.getenv("SUPABASE_USER_ID", "")
    supabase_timeout_seconds: float = float(os.getenv("SUPABASE_TIMEOUT_SECONDS", "20"))
    admin_token: str = os.getenv("CAREER_COPILOT_ADMIN_TOKEN", "")

    # Local model gateway. The safe default is mock mode, so a fresh checkout
    # never makes an external model request without an explicit configuration.
    model_provider: str = os.getenv("MODEL_PROVIDER", "mock").strip().lower()
    model_base_url: str = os.getenv("MODEL_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
    model_name: str = os.getenv("MODEL_NAME", "qwen2.5:3b")
    model_api_key: str = os.getenv("MODEL_API_KEY", "")
    model_timeout_seconds: float = float(os.getenv("MODEL_TIMEOUT_SECONDS", "45"))


settings = Settings()
