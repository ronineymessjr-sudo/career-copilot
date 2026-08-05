from __future__ import annotations

import gc
import os
import time
from pathlib import Path

TEST_DB = Path(__file__).resolve().parents[1] / "data" / "test_career_copilot.db"
os.environ["CAREER_COPILOT_DB"] = str(TEST_DB)
os.environ["CAREER_COPILOT_ADMIN_TOKEN"] = "test-admin"

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db import init_db


def _force_remove_db() -> None:
    gc.collect()
    for _ in range(50):
        if not TEST_DB.exists():
            return
        try:
            TEST_DB.unlink()
            return
        except PermissionError:
            time.sleep(0.05)
    if TEST_DB.exists():
        TEST_DB.unlink()


@pytest.fixture(autouse=True)
def clean_db():
    _force_remove_db()
    init_db()
    yield
    _force_remove_db()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
