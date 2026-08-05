# 操作日志：仅管理员可见
from __future__ import annotations

from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models import User, OperationLog
from app.schemas import OperationLogResponse, OperationLogListResponse
from app.auth import get_current_admin

router = APIRouter(prefix="/api/admin/operation-logs", tags=["操作日志"])


@router.get("", response_model=OperationLogListResponse)
async def list_operation_logs(
    page: int = 1,
    page_size: int = 50,
    user_id: Optional[int] = None,
    user_name: Optional[str] = None,
    user_ehr: Optional[str] = None,
    action: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    # 基础查询：操作日志主表
    base_conditions = []
    if user_id is not None:
        base_conditions.append(OperationLog.user_id == user_id)
    if action:
        base_conditions.append(OperationLog.action.contains(action))
    if start_time:
        base_conditions.append(OperationLog.created_at >= start_time)
    if end_time:
        base_conditions.append(OperationLog.created_at <= end_time)

    # 联表查询：需要通过 user_id 关联 User 表做 user_name / user_ehr 模糊筛选
    if user_name or user_ehr:
        # 先找出匹配的用户 ID 列表
        user_sub_q = select(User.id).where(User.deleted_at.is_(None))
        if user_name:
            user_sub_q = user_sub_q.where(User.name.contains(user_name))
        if user_ehr:
            user_sub_q = user_sub_q.where(User.ehr_no.contains(user_ehr))
        user_sub = user_sub_q.subquery()
        base_conditions.append(OperationLog.user_id.in_(select(user_sub.c.id)))

    # 总数
    count_q = select(func.count()).select_from(OperationLog)
    for c in base_conditions:
        count_q = count_q.where(c)
    total = (await db.execute(count_q)).scalar() or 0

    # 分页查询
    q = (
        select(OperationLog)
        .where(*base_conditions)
        .order_by(OperationLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(q)
    logs = result.scalars().all()

    # 补全 user 名称和 ehr
    user_ids = {log.user_id for log in logs if log.user_id}
    if user_ids:
        users_r = await db.execute(select(User).where(User.id.in_(user_ids)))
        users = {u.id: u for u in users_r.scalars().all()}
    else:
        users = {}

    items = []
    for log in logs:
        u = users.get(log.user_id)
        items.append(OperationLogResponse(
            id=log.id,
            user_id=log.user_id,
            user_name=u.name if u else None,
            user_ehr=u.ehr_no if u else None,
            action=log.action,
            resource=log.resource,
            detail=log.detail,
            ip=log.ip,
            created_at=log.created_at,
        ))

    return OperationLogListResponse(total=total, items=items)
