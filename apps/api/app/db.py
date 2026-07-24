from __future__ import annotations

import sqlite3
from contextlib import contextmanager

from .config import settings

SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id TEXT NOT NULL UNIQUE,
    payload TEXT NOT NULL,
    company TEXT NOT NULL,
    title TEXT NOT NULL,
    city TEXT,
    district TEXT,
    workplace TEXT,
    company_tier TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL UNIQUE,
    payload TEXT NOT NULL,
    score INTEGER NOT NULL,
    grade TEXT NOT NULL,
    segment TEXT NOT NULL,
    evaluated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL UNIQUE,
    payload TEXT NOT NULL,
    approval_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL UNIQUE,
    channel TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'prepared',
    note TEXT,
    submitted_at TEXT,
    next_follow_up_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS interviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    scheduled_at TEXT NOT NULL,
    round_name TEXT NOT NULL,
    mode TEXT,
    interviewer TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL UNIQUE,
    salary TEXT,
    start_date TEXT,
    deadline TEXT,
    status TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS model_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    prompt_hash TEXT NOT NULL,
    input_chars INTEGER NOT NULL DEFAULT 0,
    output_chars INTEGER NOT NULL DEFAULT 0,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    success INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_model_runs_created_at ON model_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_runs_success ON model_runs(success, created_at DESC);

CREATE TABLE IF NOT EXISTS delivery_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project TEXT NOT NULL,
    task_name TEXT NOT NULL,
    agent_tool TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT NOT NULL,
    duration_minutes REAL NOT NULL,
    files_changed INTEGER NOT NULL DEFAULT 0,
    ai_generated_lines INTEGER NOT NULL DEFAULT 0,
    human_edited_lines INTEGER NOT NULL DEFAULT 0,
    tests_run INTEGER NOT NULL DEFAULT 0,
    tests_passed INTEGER NOT NULL DEFAULT 0,
    acceptance_criteria_total INTEGER NOT NULL DEFAULT 0,
    acceptance_criteria_met INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    source_ref TEXT,
    evidence_type TEXT NOT NULL DEFAULT 'manual',
    data_quality TEXT NOT NULL DEFAULT 'self_reported',
    branch TEXT,
    commit_sha TEXT,
    ci_run_url TEXT,
    insertions INTEGER NOT NULL DEFAULT 0,
    deletions INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS model_benchmark_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    suite_name TEXT NOT NULL,
    is_demo INTEGER NOT NULL DEFAULT 0,
    comparable INTEGER NOT NULL DEFAULT 0,
    cases_total INTEGER NOT NULL DEFAULT 0,
    cases_succeeded INTEGER NOT NULL DEFAULT 0,
    average_latency_ms REAL NOT NULL DEFAULT 0,
    p95_latency_ms REAL NOT NULL DEFAULT 0,
    semantic_pass_rate REAL,
    notes TEXT,
    payload TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_benchmark_runs_created_at ON model_benchmark_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_runs_project ON delivery_runs(project, finished_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_runs_finished_at ON delivery_runs(finished_at DESC);
"""


def _ensure_sqlite_columns(conn: sqlite3.Connection) -> None:
    existing = {row[1] for row in conn.execute("PRAGMA table_info(delivery_runs)").fetchall()}
    additions = {
        "evidence_type": "TEXT NOT NULL DEFAULT 'manual'",
        "data_quality": "TEXT NOT NULL DEFAULT 'self_reported'",
        "branch": "TEXT",
        "commit_sha": "TEXT",
        "ci_run_url": "TEXT",
        "insertions": "INTEGER NOT NULL DEFAULT 0",
        "deletions": "INTEGER NOT NULL DEFAULT 0",
    }
    for name, definition in additions.items():
        if name not in existing:
            conn.execute(f"ALTER TABLE delivery_runs ADD COLUMN {name} {definition}")


def init_db() -> None:
    settings.database_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(settings.database_path) as conn:
        conn.executescript(SCHEMA)
        _ensure_sqlite_columns(conn)


@contextmanager
def connect():
    init_db()
    conn = sqlite3.connect(settings.database_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
