from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, field_validator, model_validator

RemoteType = Literal["remote", "hybrid", "onsite", "unknown"]
CompanyTier = Literal["small", "medium", "large", "unknown"]
ApplicationChannel = Literal["email", "company_form", "platform", "unknown"]
ResumeVersion = Literal["AI Agent研发版", "AI产品版", "本地过渡版"]


class JobInput(BaseModel):
    source_id: str
    company: str
    title: str
    description: str
    requirements: str = ""
    city: str = ""
    district: str = ""
    workplace: RemoteType = "unknown"
    company_tier: CompanyTier = "unknown"
    company_stage: str = ""
    company_size: str = ""
    is_internship: bool = True
    accepts_students: bool | None = None
    accepts_2028: bool | None = None
    graduation_requirement: str = ""
    days_per_week: int | None = None
    minimum_months: int | None = None
    salary: str = ""
    published_at: date | None = None
    deadline: date | None = None
    source_url: HttpUrl | None = None
    source_name: str = ""
    source_reliability: int = Field(default=3, ge=1, le=5)
    channel: ApplicationChannel = "platform"
    recruiter_email: str | None = None
    status: str = "open"
    tags: list[str] = Field(default_factory=list)

    @field_validator("days_per_week")
    @classmethod
    def validate_days(cls, value: int | None) -> int | None:
        if value is not None and not 1 <= value <= 7:
            raise ValueError("days_per_week must be between 1 and 7")
        return value


class Evidence(BaseModel):
    skill: str
    project: str
    evidence: str
    confidence: int = Field(default=90, ge=0, le=100)
    source_url: str | None = None


class CandidateProfile(BaseModel):
    name: str = "[姓名]"
    graduation_year: int = 2028
    major: str = "人工智能"
    degree: str = "本科"
    availability_days_per_week: int = 3
    availability_months: int = 3
    skills: list[str]
    projects: list[str]
    evidence: list[Evidence]


class EvaluationResult(BaseModel):
    eligible: bool
    needs_confirmation: bool
    hard_filter_reasons: list[str]
    confirmation_questions: list[str]
    role_score: int
    skill_score: int
    location_score: int
    schedule_score: int
    company_score: int
    evidence_score: int
    source_score: int
    total_score: int
    grade: Literal["S", "A", "B", "C"]
    segment: str
    matched_skills: list[str]
    missing_skills: list[str]
    matched_evidence: list[Evidence]
    inferred_hr_preference: str
    interview_risks: list[str]
    jd_tasks: list[str]


class PreparedPackage(BaseModel):
    job_id: int
    resume_version: ResumeVersion
    resume_filename: str
    highlighted_keywords: list[str]
    greeting: str
    email_subject: str | None = None
    email_body: str | None = None
    evidence_summary: list[str]
    truth_check_passed: bool
    truth_check_notes: list[str]
    approval_status: Literal["pending", "approved", "rejected"] = "pending"


class ApprovalDecision(BaseModel):
    decision: Literal["approve", "reject"]
    edited_greeting: str | None = None
    edited_email_body: str | None = None


class ApplicationUpdate(BaseModel):
    status: Literal["prepared", "submitted", "read", "contacting", "test", "interview", "offer", "rejected", "paused"]
    note: str = ""
    next_follow_up_at: datetime | None = None


class InterviewInput(BaseModel):
    job_id: int
    scheduled_at: datetime
    round_name: str = "初面"
    mode: str = "线上"
    interviewer: str = ""
    notes: str = ""


class OfferInput(BaseModel):
    job_id: int
    salary: str = ""
    start_date: date | None = None
    deadline: date | None = None
    status: Literal["received", "accepted", "declined", "expired"] = "received"
    notes: str = ""


class ModelGenerateInput(BaseModel):
    prompt: str = Field(min_length=1, max_length=20_000)
    system_prompt: str = Field(default="", max_length=4_000)
    temperature: float = Field(default=0.2, ge=0, le=2)
    max_tokens: int = Field(default=512, ge=32, le=4096)


class DeliveryRunInput(BaseModel):
    project: str
    task_name: str
    agent_tool: str
    started_at: datetime
    finished_at: datetime
    files_changed: int = Field(default=0, ge=0)
    ai_generated_lines: int = Field(default=0, ge=0)
    human_edited_lines: int = Field(default=0, ge=0)
    tests_run: int = Field(default=0, ge=0)
    tests_passed: int = Field(default=0, ge=0)
    acceptance_criteria_total: int = Field(default=0, ge=0)
    acceptance_criteria_met: int = Field(default=0, ge=0)
    notes: str = ""
    source_ref: str = ""
    evidence_type: Literal["manual", "git", "ci"] = "manual"
    data_quality: Literal["self_reported", "automated", "verified"] = "self_reported"
    branch: str = ""
    commit_sha: str = ""
    ci_run_url: str = ""
    insertions: int = Field(default=0, ge=0)
    deletions: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_delivery(self) -> "DeliveryRunInput":
        if self.finished_at < self.started_at:
            raise ValueError("finished_at cannot be earlier than started_at")
        if self.tests_passed > self.tests_run:
            raise ValueError("tests_passed cannot exceed tests_run")
        if self.acceptance_criteria_met > self.acceptance_criteria_total:
            raise ValueError("acceptance_criteria_met cannot exceed acceptance_criteria_total")
        return self


class BenchmarkRequest(BaseModel):
    suite_name: str = "internship-agent-smoke"
    max_cases: int = Field(default=4, ge=1, le=20)


class GitEvidenceRequest(BaseModel):
    repo_path: str = "."
    base_ref: str = "HEAD~1"
    head_ref: str = "HEAD"
    project: str = "Career Copilot V2"
    task_name: str = "Git/CI 自动证据采集"
    agent_tool: str = "Git + CI"
    junit_path: str = ""
    ci_run_url: str = ""

class AgentJobAnalyzeInput(BaseModel):
    jd_text: str = Field(min_length=20, max_length=30_000)
    company: str = "Demo Company"
    title: str = "AI Internship"
    city: str = ""
    district: str = ""


class AgentResumeInput(AgentJobAnalyzeInput):
    persona: Literal["agent_engineer", "ai_product", "ai_solution", "local_transition"] = "agent_engineer"


class AgentEvaluateInput(BaseModel):
    output: str = Field(min_length=1, max_length=30_000)
    citations: list[str] = Field(default_factory=list)
    expected_citations: list[str] = Field(default_factory=list)
