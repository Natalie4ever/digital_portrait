# 操作日志：仅管理员可见
from __future__ import annotations

from typing import Optional, List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, OperationLog
from app.schemas import OperationLogResponse
from app.auth import get_current_admin

router = APIRouter(prefix="/api/admin/operation-logs", tags=["操作日志"])


@router.get("", response_model=List[OperationLogResponse])
async def list_operation_logs(
    page: int = 1,
    page_size: int = 50,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    q = select(OperationLog).order_by(OperationLog.created_at.desc())
    if user_id is not None:
        q = q.where(OperationLog.user_id == user_id)
    if action:
        q = q.where(OperationLog.action.contains(action))
    q = q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    logs = result.scalars().all()
    # 补全 user 名称和 ehr
    user_ids = {log.user_id for log in logs}
    users_q = select(User).where(User.id.in_(user_ids))
    users_r = await db.execute(users_q)
    users = {u.id: u for u in users_r.scalars().all()}
    out = []
    for log in logs:
        u = users.get(log.user_id)
        out.append(OperationLogResponse(
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
    return out
