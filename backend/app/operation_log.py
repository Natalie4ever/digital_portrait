# 操作日志记录，仅管理员可见
from __future__ import annotations

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert
from app.models import OperationLog


async def log_operation(
    db: AsyncSession,
    user_id: int,
    action: str,
    resource: Optional[str] = None,
    detail: Optional[str] = None,
    ip: Optional[str] = None,
) -> None:
    await db.execute(
        insert(OperationLog).values(
            user_id=user_id,
            action=action,
            resource=resource or "",
            detail=detail,
            ip=ip,
        )
    )
