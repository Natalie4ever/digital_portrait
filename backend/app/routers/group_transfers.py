# Step 2: 组员调换历史 API
# 包含：调组 / 历史列表 / 单员工历史 / 全部组别
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import User, GroupTransferHistory
from app.schemas import (
    GroupTransferRequest,
    GroupTransferResponse,
    GroupTransferListItem,
    GroupTransferListResponse,
    GroupListResponse,
)
from app.auth import get_current_admin
from app.operation_log import log_operation

router = APIRouter(prefix="/api/admin/group-transfers", tags=["组员调换"])


async def _do_transfer(
    db: AsyncSession,
    ehr_no: str,
    to_group: str,
    transfer_date: Optional[datetime],
    reason: Optional[str],
    remark: Optional[str],
    operator: User,
):
    """调组核心逻辑（可被 update_user 复用）"""
    # 1. 锁住目标用户
    result = await db.execute(
        select(User).where(User.ehr_no == ehr_no, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    old_group = (user.group_name or "").strip()
    to_group_clean = to_group.strip()
    if not to_group_clean:
        raise HTTPException(status_code=422, detail="调入组别不能为空")
    if old_group == to_group_clean:
        raise HTTPException(status_code=400, detail=f"员工已在 {old_group}，无需调组")

    # 2. 关闭所有"未结束"的历史（leave_date = now）
    now = datetime.utcnow()
    await db.execute(
        update(GroupTransferHistory)
        .where(
            GroupTransferHistory.user_id == user.id,
            GroupTransferHistory.leave_date.is_(None),
        )
        .values(leave_date=now)
    )

    # 3. 写新记录
    new_record = GroupTransferHistory(
        user_id=user.id,
        ehr_no=user.ehr_no,
        from_group=old_group or None,
        to_group=to_group_clean,
        transfer_date=transfer_date or now,
        leave_date=None,
        operator_user_id=operator.id,
        operator_ehr_no=operator.ehr_no,
        operator_name=operator.name or "",
        reason=reason,
        remark=remark,
    )
    db.add(new_record)
    await db.flush()
    await db.refresh(new_record)

    # 4. 更新 user.group_name
    user.group_name = to_group_clean
    db.add(user)

    # 5. 写操作日志
    detail = f"{ehr_no} {old_group} -> {to_group_clean}"
    if reason:
        detail += f"（原因：{reason}）"
    await log_operation(db, operator.id, "transfer_user", "users", detail, None)

    return new_record, user


@router.post("/transfer", response_model=GroupTransferResponse)
async def transfer_user(
    body: GroupTransferRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """调组：写历史 + 更新 group_name"""
    new_record, _ = await _do_transfer(
        db, body.ehr_no, body.to_group, body.transfer_date, body.reason, body.remark, current_user,
    )
    # 加载 user_name
    return GroupTransferResponse(
        id=new_record.id,
        user_id=new_record.user_id,
        ehr_no=new_record.ehr_no,
        user_name=current_user.name,  # 暂用空，下面覆盖
        from_group=new_record.from_group,
        to_group=new_record.to_group,
        transfer_date=new_record.transfer_date,
        leave_date=new_record.leave_date,
        operator_user_id=new_record.operator_user_id,
        operator_ehr_no=new_record.operator_ehr_no,
        operator_name=new_record.operator_name,
        reason=new_record.reason,
        remark=new_record.remark,
        created_at=new_record.created_at,
    )


@router.get("", response_model=GroupTransferListResponse)
async def list_group_transfers(
    page: int = 1,
    page_size: int = 20,
    ehr_no: Optional[str] = None,
    user_name: Optional[str] = None,
    from_group: Optional[str] = None,
    to_group: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """调组历史列表：分页 + 筛选"""
    if page < 1 or page_size < 1 or page_size > 100:
        raise HTTPException(status_code=422, detail="分页参数不合法")

    base_q = (
        select(GroupTransferHistory)
        .options(selectinload(GroupTransferHistory.user))
        .order_by(GroupTransferHistory.transfer_date.desc(), GroupTransferHistory.id.desc())
    )
    if ehr_no:
        base_q = base_q.where(GroupTransferHistory.ehr_no.contains(ehr_no))
    if from_group:
        base_q = base_q.where(GroupTransferHistory.from_group == from_group)
    if to_group:
        base_q = base_q.where(GroupTransferHistory.to_group == to_group)
    if user_name:
        base_q = base_q.join(User, User.id == GroupTransferHistory.user_id).where(
            User.name.contains(user_name)
        )

    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar() or 0
    q = base_q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    rows = result.scalars().unique().all()

    items = [
        GroupTransferListItem(
            id=r.id,
            ehr_no=r.ehr_no,
            user_name=(r.user.name if r.user else None),
            from_group=r.from_group,
            to_group=r.to_group,
            transfer_date=r.transfer_date,
            leave_date=r.leave_date,
            operator_ehr_no=r.operator_ehr_no,
            operator_name=r.operator_name,
            reason=r.reason,
            remark=r.remark,
            created_at=r.created_at,
        )
        for r in rows
    ]
    return GroupTransferListResponse(total=total, items=items)


@router.get("/user/{ehr_no}", response_model=list[GroupTransferListItem])
async def get_user_transfer_history(
    ehr_no: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """查询某员工的所有调组历史（按时间倒序）"""
    result = await db.execute(
        select(GroupTransferHistory)
        .options(selectinload(GroupTransferHistory.user))
        .where(GroupTransferHistory.ehr_no == ehr_no)
        .order_by(GroupTransferHistory.transfer_date.desc(), GroupTransferHistory.id.desc())
    )
    rows = result.scalars().unique().all()
    return [
        GroupTransferListItem(
            id=r.id,
            ehr_no=r.ehr_no,
            user_name=(r.user.name if r.user else None),
            from_group=r.from_group,
            to_group=r.to_group,
            transfer_date=r.transfer_date,
            leave_date=r.leave_date,
            operator_ehr_no=r.operator_ehr_no,
            operator_name=r.operator_name,
            reason=r.reason,
            remark=r.remark,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.get("/groups", response_model=GroupListResponse)
async def list_groups(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """获取全部现存组别（去重）"""
    r = await db.execute(
        select(User.group_name).where(User.deleted_at.is_(None)).distinct().order_by(User.group_name)
    )
    items = [g for (g,) in r.all() if g]
    return GroupListResponse(items=items)
