from __future__ import annotations

import os
from pathlib import Path

TEST_DB = Path(__file__).resolve().parents[1] / "data" / "test_career_copilot.db"
os.environ["CAREER_COPILOT_DB"] = str(TEST_DB)
os.environ["CAREER_COPILOT_ADMIN_TOKEN"] = "test-admin"

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db import init_db


@pytest.fixture(autouse=True)
def clean_db():
    if TEST_DB.exists():
        TEST_DB.unlink()
    init_db()
    yield
    if TEST_DB.exists():
        TEST_DB.unlink()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
