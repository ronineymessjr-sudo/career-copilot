from __future__ import annotations

from .profile import get_profile
from .repository import (
    get_evaluation, get_job, get_package, save_evaluation, save_package,
    set_package_status, upsert_application,
)
from .schemas import ApprovalDecision
from .scoring import evaluate_job
from .tailoring import prepare_package


class WorkflowError(RuntimeError):
    pass


def evaluate_job_record(job_id: int):
    job=get_job(job_id)
    result=evaluate_job(job,get_profile())
    save_evaluation(job_id,result)
    return result


def prepare_job_record(job_id: int):
    job=get_job(job_id)
    evaluation=get_evaluation(job_id) or evaluate_job_record(job_id)
    if not evaluation.eligible:
        raise WorkflowError("岗位未通过硬性过滤")
    package=prepare_package(job_id,job,evaluation)
    package_id=save_package(package)
    return package_id,package


def decide_package(package_id: int, decision: ApprovalDecision):
    job_id,package=get_package(package_id)
    job=get_job(job_id)
    if decision.edited_greeting:
        package.greeting=decision.edited_greeting
    if decision.edited_email_body:
        package.email_body=decision.edited_email_body
    package.approval_status="approved" if decision.decision=="approve" else "rejected"
    set_package_status(package_id,package)
    if package.approval_status=="approved":
        if job.channel=="email":
            note="已批准生成邮件草稿；尚未发送"
        elif job.channel=="company_form":
            note="已批准进入官网辅助填表；提交前仍需人工确认"
        else:
            note="已创建招聘平台人工投递待办；尚未提交"
        application_id=upsert_application(job_id,job.channel,"prepared",note)
    else:
        application_id=upsert_application(job_id,job.channel,"paused","审批拒绝")
    return {"package_id":package_id,"application_id":application_id,"status":package.approval_status}
