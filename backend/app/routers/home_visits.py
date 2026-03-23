# 家访记录：组长可新建/编辑，普通员工看自己，组长看组员，管理员看全部（不可编辑）
from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import User, HomeVisitRecord
from app.schemas import (
    HomeVisitRecordCreate,
    HomeVisitRecordUpdate,
    HomeVisitRecordListItem,
    HomeVisitRecordDetailResponse,
    HomeVisitRecordListResponse,
)
from app.auth import get_current_user, leader_effective_group
from app.validators import validate_ehr_no
from app.operation_log import log_operation

router = APIRouter(prefix="/api/home-visits", tags=["家访记录"])


def _can_access_record(viewer: User, record: HomeVisitRecord, visited_user: User) -> bool:
    if viewer.role == "admin":
        return True
    if viewer.role == "leader":
        vg = leader_effective_group(viewer)
        if vg and vg == (visited_user.group_name or "").strip():
            return True
    if record.visited_user_id == viewer.id:
        return True
    return False


def _can_edit_record(viewer: User, visited_user: User) -> bool:
    """仅组长可编辑，且被家访人须为本组成员"""
    if viewer.role != "leader":
        return False
    vg = leader_effective_group(viewer)
    if not vg:
        return False
    return vg == (visited_user.group_name or "").strip()


def _can_delete_record(viewer: User, visited_user: User) -> bool:
    """组长可删本组记录，管理员可删任意"""
    if viewer.role == "admin":
        return True
    if viewer.role == "leader":
        vg = leader_effective_group(viewer)
        if vg and vg == (visited_user.group_name or "").strip():
            return True
    return False


def _build_detail_response(record: HomeVisitRecord, visited: User, visitor: User) -> HomeVisitRecordDetailResponse:
    return HomeVisitRecordDetailResponse(
        id=record.id,
        visited_user_id=record.visited_user_id,
        visited_ehr_no=visited.ehr_no,
        visited_name=visited.name,
        visitor_user_id=record.visitor_user_id,
        visitor_name=visitor.name,
        visit_year=record.visit_year,
        visit_time=record.visit_time,
        visit_method=record.visit_method,
        visit_address=record.visit_address,
        visitor_info=record.visitor_info,
        is_visited=record.is_visited,
        visit_date=record.visit_date,
        position=record.position,
        contact_phone=record.contact_phone,
        address=record.address,
        mobile=record.mobile,
        home_phone=record.home_phone,
        family1_name=record.family1_name,
        family1_relation=record.family1_relation,
        family1_contact=record.family1_contact,
        family1_work_unit=record.family1_work_unit,
        family2_name=record.family2_name,
        family2_relation=record.family2_relation,
        family2_contact=record.family2_contact,
        family2_work_unit=record.family2_work_unit,
        feedback=record.feedback,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


async def _get_record_with_users(db: AsyncSession, record_id: int) -> Optional[tuple[HomeVisitRecord, User, User]]:
    result = await db.execute(
        select(HomeVisitRecord)
        .where(HomeVisitRecord.id == record_id)
        .options(
            selectinload(HomeVisitRecord.visited_user),
            selectinload(HomeVisitRecord.visitor_user),
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        return None
    visited = record.visited_user
    visitor = record.visitor_user
    if not visited or not visitor:
        visited_res = await db.execute(select(User).where(User.id == record.visited_user_id))
        visitor_res = await db.execute(select(User).where(User.id == record.visitor_user_id))
        visited = visited_res.scalar_one_or_none()
        visitor = visitor_res.scalar_one_or_none()
    return (record, visited, visitor) if visited and visitor else None


@router.get("", response_model=HomeVisitRecordListResponse)
async def list_home_visits(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    visited_ehr: Optional[str] = None,
    visit_year: Optional[int] = None,
    is_visited: Optional[bool] = None,
    visit_method: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base_q = (
        select(HomeVisitRecord)
        .join(User, HomeVisitRecord.visited_user_id == User.id)
        .where(User.deleted_at.is_(None))
    )
    if current_user.role == "user":
        base_q = base_q.where(HomeVisitRecord.visited_user_id == current_user.id)
    elif current_user.role == "leader":
        lg = leader_effective_group(current_user)
        if lg is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="组长未配置有效组别，无法查看家访列表，请联系管理员",
            )
        base_q = base_q.where(User.group_name == lg)

    if visited_ehr:
        try:
            ehr = validate_ehr_no(visited_ehr)
            base_q = base_q.where(User.ehr_no == ehr)
        except ValueError:
            pass
    if visit_year is not None:
        base_q = base_q.where(HomeVisitRecord.visit_year == visit_year)
    if is_visited is not None:
        base_q = base_q.where(HomeVisitRecord.is_visited == is_visited)
    if visit_method:
        base_q = base_q.where(HomeVisitRecord.visit_method == visit_method)

    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar_one() or 0

    q = (
        base_q.options(
            selectinload(HomeVisitRecord.visited_user),
        )
        .order_by(HomeVisitRecord.visit_time.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(q)
    records = result.scalars().unique().all()

    items = []
    for r in records:
        visited = r.visited_user
        items.append(
            HomeVisitRecordListItem(
                id=r.id,
                visited_ehr_no=visited.ehr_no,
                visited_name=visited.name,
                position=r.position,
                visit_year=r.visit_year,
                visit_time=r.visit_time,
                visit_method=r.visit_method,
                is_visited=r.is_visited,
                created_at=r.created_at,
            )
        )
    return HomeVisitRecordListResponse(total=total, items=items)


@router.get("/{record_id}", response_model=HomeVisitRecordDetailResponse)
async def get_home_visit(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await _get_record_with_users(db, record_id)
    if not data:
        raise HTTPException(status_code=404, detail="家访记录不存在")
    record, visited, visitor = data
    if not _can_access_record(current_user, record, visited):
        raise HTTPException(status_code=403, detail="无权限查看该家访记录")

    return _build_detail_response(record, visited, visitor)


@router.post("", response_model=HomeVisitRecordDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_home_visit(
    body: HomeVisitRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "leader":
        raise HTTPException(status_code=403, detail="仅组长可新建家访记录")

    lg = leader_effective_group(current_user)
    if lg is None:
        raise HTTPException(status_code=403, detail="组长未配置有效组别，无法新建家访记录")

    target = await db.execute(
        select(User).where(User.ehr_no == body.visited_ehr_no, User.deleted_at.is_(None))
    )
    target_user = target.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="被家访人不存在")
    if (target_user.group_name or "").strip() != lg:
        raise HTTPException(status_code=403, detail="只能对本组成员进行家访")

    record = HomeVisitRecord(
        visited_user_id=target_user.id,
        visitor_user_id=current_user.id,
        visit_year=body.visit_year,
        visit_time=body.visit_time,
        visit_method=body.visit_method,
        visit_address=body.visit_address,
        visitor_info=body.visitor_info,
        is_visited=body.is_visited,
        visit_date=body.visit_date,
        position=body.position,
        contact_phone=body.contact_phone,
        address=body.address,
        mobile=body.mobile,
        home_phone=body.home_phone,
        family1_name=body.family1_name,
        family1_relation=body.family1_relation,
        family1_contact=body.family1_contact,
        family1_work_unit=body.family1_work_unit,
        family2_name=body.family2_name,
        family2_relation=body.family2_relation,
        family2_contact=body.family2_contact,
        family2_work_unit=body.family2_work_unit,
        feedback=body.feedback,
    )
    db.add(record)
    await db.flush()

    await log_operation(
        db, current_user.id, "create", "home_visit",
        f"新建家访记录 id={record.id} 被家访人={target_user.ehr_no}"
    )

    data = await _get_record_with_users(db, record.id)
    if data:
        return _build_detail_response(data[0], data[1], data[2])
    raise HTTPException(status_code=500, detail="创建成功但获取详情失败")


@router.put("/{record_id}", response_model=HomeVisitRecordDetailResponse)
async def update_home_visit(
    record_id: int,
    body: HomeVisitRecordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await _get_record_with_users(db, record_id)
    if not data:
        raise HTTPException(status_code=404, detail="家访记录不存在")
    record, visited, visitor = data
    if not _can_access_record(current_user, record, visited):
        raise HTTPException(status_code=403, detail="无权限查看该家访记录")
    if not _can_edit_record(current_user, visited):
        raise HTTPException(status_code=403, detail="仅组长可编辑家访记录，管理员不可编辑")

    update_data = body.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(record, k, v)
    await db.flush()

    await log_operation(
        db, current_user.id, "update", "home_visit",
        f"更新家访记录 id={record.id}"
    )

    data = await _get_record_with_users(db, record_id)
    if data:
        return _build_detail_response(data[0], data[1], data[2])
    raise HTTPException(status_code=404, detail="家访记录不存在")


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_home_visit(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await _get_record_with_users(db, record_id)
    if not data:
        raise HTTPException(status_code=404, detail="家访记录不存在")
    record, visited, visitor = data
    if not _can_access_record(current_user, record, visited):
        raise HTTPException(status_code=403, detail="无权限查看该家访记录")
    if not _can_delete_record(current_user, visited):
        raise HTTPException(status_code=403, detail="无权限删除该家访记录")

    await db.delete(record)
    await log_operation(
        db, current_user.id, "delete", "home_visit",
        f"删除家访记录 id={record_id}"
    )
