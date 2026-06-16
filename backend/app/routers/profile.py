# 个人信息维护：基础信息与各子表增删改查，权限：本人/组长看组员/管理员看全部
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, exists
from sqlalchemy.orm import selectinload

from typing import List, Optional, Union

from app.database import get_db
from app.models import (
    User,
    Profile,
    PoliticalInfo,
    EducationInfo,
    FamilyInfo,
    ResumeInfo,
    RewardInfo,
    QualificationInfo,
    AchievementInfo,
    LanguageInfo,
    ContactInfo,
    ProfileSkillTag,
    # Step 1 1.3（修订版）/ 1.4
    DevelopmentIntent,
    ProjectSummary,
    ProjectSummaryTag,
    SkillTagTemplate,
    # Step 2
    GroupTransferHistory,
)
from app.schemas import (
    ProfileBaseUpdate,
    ProfileFullResponse,
    PoliticalInfoCreate,
    PoliticalInfoUpdate,
    PoliticalInfoResponse,
    EducationInfoCreate,
    EducationInfoUpdate,
    EducationInfoResponse,
    FamilyInfoCreate,
    FamilyInfoUpdate,
    FamilyInfoResponse,
    ResumeInfoCreate,
    ResumeInfoUpdate,
    ResumeInfoResponse,
    RewardInfoCreate,
    RewardInfoUpdate,
    RewardInfoResponse,
    QualificationInfoCreate,
    QualificationInfoUpdate,
    QualificationInfoResponse,
    AchievementInfoCreate,
    AchievementInfoUpdate,
    AchievementInfoResponse,
    LanguageInfoCreate,
    LanguageInfoUpdate,
    LanguageInfoResponse,
    ContactInfoCreate,
    ContactInfoUpdate,
    ContactInfoResponse,
    ProfileSkillTagCreate,
    ProfileSkillTagResponse,
    ProfileListResponse,
    ProfileListItem,
    # Step 1
    DevelopmentIntentUpdate,
    DevelopmentIntentResponse,
    ProjectSummaryCreate,
    ProjectSummaryUpdate,
    ProjectSummaryResponse,
)
from app.auth import get_current_user, leader_effective_group
from app.validators import validate_id_number, validate_mobile, validate_phone, validate_date, validate_ehr_no
from app.operation_log import log_operation

router = APIRouter(prefix="/api/profile", tags=["个人档案"])


async def _leader_can_access(db: AsyncSession, viewer: User, target: User) -> bool:
    """Step 2: 组长判定 — 基于调换历史 leave_date IS NULL"""
    lg = leader_effective_group(viewer)
    if not lg:
        return False
    r = await db.execute(
        select(GroupTransferHistory)
        .where(
            GroupTransferHistory.user_id == target.id,
            GroupTransferHistory.leave_date.is_(None),
        )
    )
    active = r.scalar_one_or_none()
    if not active:
        return False
    return (active.to_group or "").strip() == lg


def _can_access(viewer: User, target: User) -> bool:
    """同步部分：admin / 本人判定（不需 DB）。组长判定需走 async 版本 _can_access_with_db"""
    if viewer.role == "admin":
        return True
    if viewer.ehr_no == target.ehr_no:
        return True
    return False  # 组长情况交给 _can_access_with_db 判定


async def _can_access_with_db(db: AsyncSession, viewer: User, target: User) -> bool:
    """Step 2: 完整 ACL：admin 全通 / leader 查历史 / 本人"""
    if viewer.role == "admin":
        return True
    if viewer.ehr_no == target.ehr_no:
        return True
    if viewer.role == "leader":
        return await _leader_can_access(db, viewer, target)
    return False


async def _get_target_user(db: AsyncSession, ehr_no: str) -> Optional[User]:
    result = await db.execute(
        select(User).where(User.ehr_no == ehr_no, User.deleted_at.is_(None))
    )
    return result.scalar_one_or_none()


async def _get_or_create_profile(db: AsyncSession, user_id: int) -> Profile:
    result = await db.execute(select(Profile).where(Profile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if not profile:
        profile = Profile(user_id=user_id)
        db.add(profile)
        await db.flush()
    return profile


# ---------- 获取档案（本人/组长看组员/管理员看全部）----------
@router.get("/me", response_model=ProfileFullResponse)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await _profile_response(db, current_user)


@router.get("/by-ehr/{ehr_no}", response_model=ProfileFullResponse)
async def get_profile_by_ehr(
    ehr_no: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        ehr_no = validate_ehr_no(ehr_no)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    target = await _get_target_user(db, ehr_no)
    if not target:
        raise HTTPException(status_code=404, detail="用户不存在")
    if not await _can_access_with_db(db, current_user, target):
        raise HTTPException(status_code=403, detail="无权限查看该用户档案")
    return await _profile_response(db, target)


@router.get("/admin/list", response_model=ProfileListResponse)
async def list_profiles_admin(
    page: int = 1,
    page_size: int = 20,
    ehr_no: Optional[str] = None,
    name: Optional[str] = None,
    group_name: Optional[str] = None,
    role: Optional[str] = None,
    tag: Optional[str] = None,
    commute_lt: Optional[int] = None,
    is_emergency_staff: Optional[bool] = None,
    include_disabled: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin", "leader"):
        raise HTTPException(status_code=403, detail="无权限访问档案列表")
    if page < 1 or page_size < 1 or page_size > 100:
        raise HTTPException(status_code=422, detail="分页参数不合法")

    base_q = select(User).where(User.deleted_at.is_(None))
    if not include_disabled:
        base_q = base_q.where(User.is_disabled.is_(False))
    if ehr_no:
        base_q = base_q.where(User.ehr_no.contains(ehr_no))
    if name:
        base_q = base_q.where(User.name.contains(name))
    if group_name:
        base_q = base_q.where(User.group_name == group_name)
    if role:
        base_q = base_q.where(User.role == role)
    if current_user.role == "leader":
        lg = leader_effective_group(current_user)
        if lg is None:
            raise HTTPException(
                status_code=403,
                detail="组长未配置有效组别，无法访问档案列表，请联系管理员",
            )
        base_q = base_q.where(User.group_name == lg)
    if is_emergency_staff is not None:
        base_q = base_q.where(
            exists().where(Profile.user_id == User.id, Profile.is_emergency_staff == is_emergency_staff)
        )

    if tag:
        tag_subq = (
            select(ProfileSkillTag.id)
            .join(Profile, ProfileSkillTag.profile_id == Profile.id)
            .where(
                ProfileSkillTag.tag_name.contains(tag),
                Profile.user_id == User.id,
            )
        )
        base_q = base_q.where(exists(tag_subq))
    if commute_lt is not None:
        commute_subq = (
            select(ContactInfo.id)
            .join(Profile, ContactInfo.profile_id == Profile.id)
            .where(
                Profile.user_id == User.id,
                ContactInfo.commute_minutes.is_not(None),
                ContactInfo.commute_minutes < commute_lt,
            )
        )
        base_q = base_q.where(exists(commute_subq))

    count_q = select(func.count()).select_from(base_q.subquery())
    total_res = await db.execute(count_q)
    total = total_res.scalar_one()

    q = (
        base_q.options(
            selectinload(User.profile)
            .selectinload(Profile.contact),
            selectinload(User.profile)
            .selectinload(Profile.skill_tags),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
        .order_by(User.id)
    )
    result = await db.execute(q)
    users = result.scalars().unique().all()

    items: list[ProfileListItem] = []
    for u in users:
        profile = u.profile
        tags: list[str] = []
        commute_minutes: Optional[int] = None
        is_emergency = False
        if profile:
            tags = [t.tag_name for t in profile.skill_tags]
            if profile.contact:
                commute_minutes = profile.contact.commute_minutes
            is_emergency = bool(profile.is_emergency_staff)
        items.append(
            ProfileListItem(
                ehr_no=u.ehr_no,
                name=u.name,
                group_name=u.group_name,
                role=u.role,
                tags=tags,
                commute_minutes=commute_minutes,
                is_emergency_staff=is_emergency,
            )
        )
    return ProfileListResponse(total=total, items=items)


# ===================== Step 1 1.1（修订）: 档案管理列表切换应急先锋队 =====================
@router.post("/admin/{ehr_no}/toggle-emergency")
async def toggle_emergency_profile(
    ehr_no: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """档案管理列表调用：admin 可切任意人，leader 仅可切本组"""
    if current_user.role not in ("admin", "leader"):
        raise HTTPException(status_code=403, detail="无权限标记应急先锋队")
    try:
        ehr_no = validate_ehr_no(ehr_no)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    r = await db.execute(
        select(User)
        .where(User.ehr_no == ehr_no, User.deleted_at.is_(None))
        .options(selectinload(User.profile))
    )
    user = r.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if current_user.role == "leader":
        lg = leader_effective_group(current_user)
        if not lg or (user.group_name or "").strip() != lg:
            raise HTTPException(status_code=403, detail="仅可标记本组成员")
    profile = user.profile
    if not profile:
        profile = Profile(user_id=user.id)
        db.add(profile)
        await db.flush()
    profile.is_emergency_staff = not bool(profile.is_emergency_staff)
    await log_operation(
        db, current_user.id, "toggle_emergency_staff", "profile",
        f"{ehr_no} -> is_emergency_staff={profile.is_emergency_staff}", None,
    )
    return {"ehr_no": ehr_no, "is_emergency_staff": profile.is_emergency_staff}


async def _profile_response(db: AsyncSession, user: User) -> ProfileFullResponse:
    result = await db.execute(
        select(Profile)
        .where(Profile.user_id == user.id)
        .options(
            selectinload(Profile.political),
            selectinload(Profile.education),
            selectinload(Profile.family),
            selectinload(Profile.resume),
            selectinload(Profile.reward),
            selectinload(Profile.qualification),
            selectinload(Profile.achievement),
            selectinload(Profile.language),
            selectinload(Profile.contact),
            selectinload(Profile.skill_tags),
            # Step 1 1.3（修订版）
            selectinload(Profile.development_intent),
            selectinload(Profile.project_summaries).selectinload(ProjectSummary.tags),
        )
    )
    profile = result.scalar_one_or_none()
    base = None
    political = []
    education = []
    family = []
    resume = []
    reward = []
    qualification = []
    achievement = []
    language = []
    contact = None
    skill_tags = []
    development_intent = None
    project_summaries = []
    if profile:
        base = ProfileBaseUpdate(
            gender=profile.gender,
            nation=profile.nation,
            birth_date=profile.birth_date,
            job_title=profile.job_title,
            id_type=profile.id_type,
            id_number=profile.id_number,
            native_place=profile.native_place,
            birth_place=profile.birth_place,
            household_place=profile.household_place,
            work_start_date=profile.work_start_date,
            hire_date=profile.hire_date,
            marital_status=profile.marital_status,
            is_emergency_staff=profile.is_emergency_staff,
        )
        political = [PoliticalInfoResponse.model_validate(p) for p in profile.political]
        education = [EducationInfoResponse.model_validate(e) for e in profile.education]
        family = [FamilyInfoResponse.model_validate(f) for f in profile.family]
        resume = [ResumeInfoResponse.model_validate(r) for r in profile.resume]
        reward = [RewardInfoResponse.model_validate(r) for r in profile.reward]
        qualification = [QualificationInfoResponse.model_validate(q) for q in profile.qualification]
        achievement = [AchievementInfoResponse.model_validate(a) for a in profile.achievement]
        language = [LanguageInfoResponse.model_validate(l) for l in profile.language]
        if profile.contact:
            contact = ContactInfoResponse.model_validate(profile.contact)
        skill_tags = [ProfileSkillTagResponse.model_validate(s) for s in profile.skill_tags]
        # Step 1 1.3（修订版）：发展意向 1:1
        if profile.development_intent:
            di = profile.development_intent
            import json
            def _loads_list(v):
                if not v:
                    return []
                if isinstance(v, list):
                    return v
                try:
                    parsed = json.loads(v)
                    return parsed if isinstance(parsed, list) else []
                except Exception:
                    return []
            development_intent = DevelopmentIntentResponse(
                id=di.id,
                profile_id=di.profile_id,
                development_path=di.development_path,
                short_term_goal=di.short_term_goal,
                mid_term_goal=di.mid_term_goal,
                core_abilities=_loads_list(di.core_abilities),
                learning_methods=_loads_list(di.learning_methods),
                learning_courses=di.learning_courses,
                rotation_interest=di.rotation_interest,
                rotation_target=di.rotation_target,
                project_interests=_loads_list(di.project_interests),
                other_comments=di.other_comments,
                created_at=di.created_at,
                updated_at=di.updated_at,
            )
        # 项目总结：批量查标签名避免 lazy load 触发 greenlet 错误
        all_tag_ids = list({t.tag_id for p in profile.project_summaries for t in p.tags})
        tag_name_map: dict[int, str] = {}
        if all_tag_ids:
            tag_result = await db.execute(
                select(SkillTagTemplate).where(SkillTagTemplate.id.in_(all_tag_ids))
            )
            for t in tag_result.scalars().all():
                tag_name_map[t.id] = t.name
        project_summaries_resp: list[ProjectSummaryResponse] = []
        for p in profile.project_summaries:
            tag_ids = [t.tag_id for t in p.tags]
            tag_names = [tag_name_map.get(tid, "") for tid in tag_ids]
            project_summaries_resp.append(
                ProjectSummaryResponse(
                    id=p.id,
                    profile_id=p.profile_id,
                    project_name=p.project_name,
                    start_time=p.start_time,
                    end_time=p.end_time,
                    role=p.role,
                    description=p.description,
                    tag_ids=tag_ids,
                    tag_names=tag_names,
                    created_at=p.created_at,
                    updated_at=p.updated_at,
                )
            )
        project_summaries = project_summaries_resp
    return ProfileFullResponse(
        user_id=user.id,
        ehr_no=user.ehr_no,
        name=user.name,
        group_name=user.group_name,
        base=base,
        political=political,
        education=education,
        family=family,
        resume=resume,
        reward=reward,
        qualification=qualification,
        achievement=achievement,
        language=language,
        contact=contact,
        skill_tags=skill_tags,
        development_intent=development_intent,
        project_summaries=project_summaries,
    )


# ---------- 更新基础信息（姓名、ehr、组别不可改，在用户表）----------
@router.put("/me/base")
async def update_my_base(
    body: ProfileBaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = await _get_or_create_profile(db, current_user.id)
    data = body.model_dump(exclude_unset=True)
    if "id_number" in data and data["id_number"] is not None:
        try:
            data["id_number"] = validate_id_number(data["id_number"])
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    for k, v in data.items():
        if k in ("birth_date", "work_start_date", "hire_date") and v is not None:
            try:
                v = validate_date(v)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
        setattr(profile, k, v)
    db.add(profile)
    await log_operation(db, current_user.id, "update_profile_base", "profile", "更新基础信息", None)
    return {"message": "ok"}


@router.put("/by-ehr/{ehr_no}/base")
async def update_profile_base_by_ehr(
    ehr_no: str,
    body: ProfileBaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        ehr_no = validate_ehr_no(ehr_no)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    target = await _get_target_user(db, ehr_no)
    if not target:
        raise HTTPException(status_code=404, detail="用户不存在")
    if not await _can_access_with_db(db, current_user, target) or current_user.ehr_no != target.ehr_no:
        raise HTTPException(status_code=403, detail="仅本人可修改自己的基础信息")
    profile = await _get_or_create_profile(db, target.id)
    data = body.model_dump(exclude_unset=True)
    if "id_number" in data and data["id_number"] is not None:
        try:
            data["id_number"] = validate_id_number(data["id_number"])
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    for k, v in data.items():
        if k in ("birth_date", "work_start_date", "hire_date") and v is not None:
            try:
                v = validate_date(v)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
        setattr(profile, k, v)
    db.add(profile)
    await log_operation(db, current_user.id, "update_profile_base", "profile", f"更新 {ehr_no} 基础信息", None)
    return {"message": "ok"}


# ---------- 政治面貌 CRUD ----------
async def _resolve_profile_id(db: AsyncSession, current_user: User, ehr_no: Optional[str]) -> tuple[Profile, User]:
    """
    解析目标 profile 与 user。
    - ehr_no 为空：操作 current_user 本人
    - ehr_no 非空：操作指定用户，需要 _can_access 通过（admin 全权限 / leader 同组 / 本人）
    """
    if ehr_no:
        target = await _get_target_user(db, ehr_no)
        if not target:
            raise HTTPException(status_code=404, detail="用户不存在")
        if not await _can_access_with_db(db, current_user, target):
            raise HTTPException(status_code=403, detail="无权限操作该用户档案")
        user = target
    else:
        user = current_user
    profile = await _get_or_create_profile(db, user.id)
    return profile, user


@router.post("/me/political", response_model=PoliticalInfoResponse)
async def create_political_me(
    body: PoliticalInfoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    join_date = validate_date(body.join_date) if body.join_date else None
    obj = PoliticalInfo(
        profile_id=profile.id,
        political_status=body.political_status,
        join_date=join_date,
        introducer=body.introducer,
    )
    db.add(obj)
    await db.flush()
    await log_operation(db, current_user.id, "create", "political_info", None, None)
    return PoliticalInfoResponse.model_validate(obj)


@router.put("/me/political/{item_id}", response_model=PoliticalInfoResponse)
async def update_political_me(
    item_id: int,
    body: PoliticalInfoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    result = await db.execute(select(PoliticalInfo).where(PoliticalInfo.id == item_id, PoliticalInfo.profile_id == profile.id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    join_date = validate_date(body.join_date) if body.join_date is not None else obj.join_date
    if body.join_date is not None:
        join_date = validate_date(body.join_date)
    for k, v in body.model_dump(exclude_unset=True).items():
        if k == "join_date":
            setattr(obj, k, join_date)
        else:
            setattr(obj, k, v)
    db.add(obj)
    await db.flush()
    await log_operation(db, current_user.id, "update", "political_info", str(item_id), None)
    return PoliticalInfoResponse.model_validate(obj)


@router.delete("/me/political/{item_id}")
async def delete_political_me(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    result = await db.execute(select(PoliticalInfo).where(PoliticalInfo.id == item_id, PoliticalInfo.profile_id == profile.id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    await db.delete(obj)
    await log_operation(db, current_user.id, "delete", "political_info", str(item_id), None)
    return {"message": "ok"}


# ---------- 学历学位 CRUD ----------
@router.post("/me/education", response_model=EducationInfoResponse)
async def create_education_me(
    body: EducationInfoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    obj = EducationInfo(profile_id=profile.id, **body.model_dump())
    db.add(obj)
    await db.flush()
    return EducationInfoResponse.model_validate(obj)


@router.put("/me/education/{item_id}", response_model=EducationInfoResponse)
async def update_education_me(
    item_id: int,
    body: EducationInfoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    result = await db.execute(select(EducationInfo).where(EducationInfo.id == item_id, EducationInfo.profile_id == profile.id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.add(obj)
    await db.flush()
    return EducationInfoResponse.model_validate(obj)


@router.delete("/me/education/{item_id}")
async def delete_education_me(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    result = await db.execute(select(EducationInfo).where(EducationInfo.id == item_id, EducationInfo.profile_id == profile.id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    await db.delete(obj)
    return {"message": "ok"}


# ---------- 家庭关系 CRUD ----------
@router.post("/me/family", response_model=FamilyInfoResponse)
async def create_family_me(
    body: FamilyInfoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    birth_date = validate_date(body.birth_date) if body.birth_date else None
    obj = FamilyInfo(
        profile_id=profile.id,
        relation=body.relation,
        name=body.name,
        birth_date=birth_date,
        work_unit_and_title=body.work_unit_and_title,
    )
    db.add(obj)
    await db.flush()
    return FamilyInfoResponse.model_validate(obj)


@router.put("/me/family/{item_id}", response_model=FamilyInfoResponse)
async def update_family_me(
    item_id: int,
    body: FamilyInfoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    result = await db.execute(select(FamilyInfo).where(FamilyInfo.id == item_id, FamilyInfo.profile_id == profile.id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        if k == "birth_date" and v is not None:
            v = validate_date(v)
        setattr(obj, k, v)
    db.add(obj)
    await db.flush()
    return FamilyInfoResponse.model_validate(obj)


@router.delete("/me/family/{item_id}")
async def delete_family_me(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    result = await db.execute(select(FamilyInfo).where(FamilyInfo.id == item_id, FamilyInfo.profile_id == profile.id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    await db.delete(obj)
    return {"message": "ok"}


# ---------- 简历 CRUD ----------
@router.post("/me/resume", response_model=ResumeInfoResponse)
async def create_resume_me(
    body: ResumeInfoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    start_time = validate_date(body.start_time) if body.start_time else None
    end_time = validate_date(body.end_time) if body.end_time else None
    obj = ResumeInfo(
        profile_id=profile.id,
        start_time=start_time,
        end_time=end_time,
        unit_and_title=body.unit_and_title,
    )
    db.add(obj)
    await db.flush()
    return ResumeInfoResponse.model_validate(obj)


@router.put("/me/resume/{item_id}", response_model=ResumeInfoResponse)
async def update_resume_me(
    item_id: int,
    body: ResumeInfoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    result = await db.execute(select(ResumeInfo).where(ResumeInfo.id == item_id, ResumeInfo.profile_id == profile.id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        if k in ("start_time", "end_time") and v is not None:
            v = validate_date(v)
        setattr(obj, k, v)
    db.add(obj)
    await db.flush()
    return ResumeInfoResponse.model_validate(obj)


@router.delete("/me/resume/{item_id}")
async def delete_resume_me(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    result = await db.execute(select(ResumeInfo).where(ResumeInfo.id == item_id, ResumeInfo.profile_id == profile.id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    await db.delete(obj)
    return {"message": "ok"}


# ---------- 奖惩 CRUD ----------
@router.post("/me/reward", response_model=RewardInfoResponse)
async def create_reward_me(
    body: RewardInfoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    reward_time = validate_date(body.reward_time) if body.reward_time else None
    obj = RewardInfo(
        profile_id=profile.id,
        reward_type=body.reward_type,
        reward_time=reward_time,
        reward_name=body.reward_name,
        reward_reason=body.reward_reason,
    )
    db.add(obj)
    await db.flush()
    return RewardInfoResponse.model_validate(obj)


@router.put("/me/reward/{item_id}", response_model=RewardInfoResponse)
async def update_reward_me(
    item_id: int,
    body: RewardInfoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    result = await db.execute(select(RewardInfo).where(RewardInfo.id == item_id, RewardInfo.profile_id == profile.id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        if k == "reward_time" and v is not None:
            v = validate_date(v)
        setattr(obj, k, v)
    db.add(obj)
    await db.flush()
    return RewardInfoResponse.model_validate(obj)


@router.delete("/me/reward/{item_id}")
async def delete_reward_me(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    result = await db.execute(select(RewardInfo).where(RewardInfo.id == item_id, RewardInfo.profile_id == profile.id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    await db.delete(obj)
    return {"message": "ok"}


# ---------- 外部资格 CRUD ----------
@router.post("/me/qualification", response_model=QualificationInfoResponse)
async def create_qualification_me(
    body: QualificationInfoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    obtain_time = validate_date(body.obtain_time) if body.obtain_time else None
    valid_until = validate_date(body.valid_until) if body.valid_until else None
    obj = QualificationInfo(
        profile_id=profile.id,
        qualification_name=body.qualification_name,
        obtain_time=obtain_time,
        valid_until=valid_until,
    )
    db.add(obj)
    await db.flush()
    return QualificationInfoResponse.model_validate(obj)


@router.put("/me/qualification/{item_id}", response_model=QualificationInfoResponse)
async def update_qualification_me(
    item_id: int,
    body: QualificationInfoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    result = await db.execute(select(QualificationInfo).where(QualificationInfo.id == item_id, QualificationInfo.profile_id == profile.id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        if k in ("obtain_time", "valid_until") and v is not None:
            v = validate_date(v)
        setattr(obj, k, v)
    db.add(obj)
    await db.flush()
    return QualificationInfoResponse.model_validate(obj)


@router.delete("/me/qualification/{item_id}")
async def delete_qualification_me(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    result = await db.execute(select(QualificationInfo).where(QualificationInfo.id == item_id, QualificationInfo.profile_id == profile.id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    await db.delete(obj)
    return {"message": "ok"}


# ---------- 专业成果 CRUD ----------
@router.post("/me/achievement", response_model=AchievementInfoResponse)
async def create_achievement_me(
    body: AchievementInfoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    obtain_time = validate_date(body.obtain_time) if body.obtain_time else None
    obj = AchievementInfo(profile_id=profile.id, achievement_name=body.achievement_name, obtain_time=obtain_time)
    db.add(obj)
    await db.flush()
    return AchievementInfoResponse.model_validate(obj)


@router.put("/me/achievement/{item_id}", response_model=AchievementInfoResponse)
async def update_achievement_me(
    item_id: int,
    body: AchievementInfoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    result = await db.execute(select(AchievementInfo).where(AchievementInfo.id == item_id, AchievementInfo.profile_id == profile.id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        if k == "obtain_time" and v is not None:
            v = validate_date(v)
        setattr(obj, k, v)
    db.add(obj)
    await db.flush()
    return AchievementInfoResponse.model_validate(obj)


@router.delete("/me/achievement/{item_id}")
async def delete_achievement_me(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    result = await db.execute(select(AchievementInfo).where(AchievementInfo.id == item_id, AchievementInfo.profile_id == profile.id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    await db.delete(obj)
    return {"message": "ok"}


# ---------- 语言能力 CRUD ----------
@router.post("/me/language", response_model=LanguageInfoResponse)
async def create_language_me(
    body: LanguageInfoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    obj = LanguageInfo(
        profile_id=profile.id,
        language=body.language,
        proficiency=body.proficiency,
        cert_level_or_score=body.cert_level_or_score,
    )
    db.add(obj)
    await db.flush()
    return LanguageInfoResponse.model_validate(obj)


@router.put("/me/language/{item_id}", response_model=LanguageInfoResponse)
async def update_language_me(
    item_id: int,
    body: LanguageInfoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    result = await db.execute(select(LanguageInfo).where(LanguageInfo.id == item_id, LanguageInfo.profile_id == profile.id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.add(obj)
    await db.flush()
    return LanguageInfoResponse.model_validate(obj)


@router.delete("/me/language/{item_id}")
async def delete_language_me(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    result = await db.execute(select(LanguageInfo).where(LanguageInfo.id == item_id, LanguageInfo.profile_id == profile.id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    await db.delete(obj)
    return {"message": "ok"}


# ---------- 通讯信息（单条）----------
@router.get("/me/contact", response_model=Optional[ContactInfoResponse])
async def get_contact_me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = await _get_or_create_profile(db, current_user.id)
    result = await db.execute(select(ContactInfo).where(ContactInfo.profile_id == profile.id))
    obj = result.scalar_one_or_none()
    return ContactInfoResponse.model_validate(obj) if obj else None


@router.put("/me/contact", response_model=ContactInfoResponse)
async def upsert_contact_me(
    body: Union[ContactInfoCreate, ContactInfoUpdate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = await _get_or_create_profile(db, current_user.id)
    result = await db.execute(select(ContactInfo).where(ContactInfo.profile_id == profile.id))
    obj = result.scalar_one_or_none()
    mobile = getattr(body, "mobile", None)
    if mobile is not None:
        try:
            mobile = validate_mobile(mobile)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    office_phone = getattr(body, "office_phone", None)
    home_phone = getattr(body, "home_phone", None)
    if office_phone is not None:
        try:
            office_phone = validate_phone(office_phone)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    if home_phone is not None:
        try:
            home_phone = validate_phone(home_phone)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    if not obj:
        obj = ContactInfo(
            profile_id=profile.id,
            mobile=mobile,
            office_phone=office_phone,
            home_phone=home_phone,
            home_address=getattr(body, "home_address", None),
            email=getattr(body, "email", None),
            commute_minutes=getattr(body, "commute_minutes", None),
        )
        db.add(obj)
    else:
        if mobile is not None:
            obj.mobile = mobile
        if office_phone is not None:
            obj.office_phone = office_phone
        if home_phone is not None:
            obj.home_phone = home_phone
        for k in ("home_address", "email", "commute_minutes"):
            v = getattr(body, k, None)
            if v is not None:
                setattr(obj, k, v)
    await db.flush()
    return ContactInfoResponse.model_validate(obj)


# ---------- 技能标签 CRUD ----------
@router.get("/me/skill-tags", response_model=list[ProfileSkillTagResponse])
async def get_skill_tags_me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = await _get_or_create_profile(db, current_user.id)
    result = await db.execute(select(ProfileSkillTag).where(ProfileSkillTag.profile_id == profile.id))
    items = result.scalars().all()
    return [ProfileSkillTagResponse.model_validate(x) for x in items]


@router.post("/me/skill-tags", response_model=ProfileSkillTagResponse)
async def add_skill_tag_me(
    body: ProfileSkillTagCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = await _get_or_create_profile(db, current_user.id)
    obj = ProfileSkillTag(
        profile_id=profile.id,
        tag_name=body.tag_name.strip(),
        template_id=body.template_id,
    )
    db.add(obj)
    await db.flush()
    return ProfileSkillTagResponse.model_validate(obj)


@router.delete("/me/skill-tags/{item_id}")
async def delete_skill_tag_me(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, None)
    result = await db.execute(select(ProfileSkillTag).where(ProfileSkillTag.id == item_id, ProfileSkillTag.profile_id == profile.id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    await db.delete(obj)
    return {"message": "ok"}


# ===================== Step 1 1.3（修订版）: 发展意向 1:1 单表 =====================
import json as _json

def _dump_list_to_str(v) -> str | None:
    """多选数组序列化为 JSON 字符串存库（None/空保持 None）"""
    if v is None:
        return None
    if isinstance(v, str):
        return v if v else None
    if isinstance(v, list):
        if not v:
            return None
        return _json.dumps(v, ensure_ascii=False)
    return None


@router.get("/me/development-intent", response_model=Optional[DevelopmentIntentResponse])
async def get_development_intent_me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = await _get_or_create_profile(db, current_user.id)
    result = await db.execute(
        select(DevelopmentIntent).where(DevelopmentIntent.profile_id == profile.id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        return None

    def _loads_list_safe(v):
        if v is None or v == "":
            return []
        if isinstance(v, list):
            return v
        try:
            parsed = _json.loads(v)
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []
    return DevelopmentIntentResponse(
        id=obj.id,
        profile_id=obj.profile_id,
        development_path=obj.development_path,
        short_term_goal=obj.short_term_goal,
        mid_term_goal=obj.mid_term_goal,
        core_abilities=_loads_list_safe(obj.core_abilities),
        learning_methods=_loads_list_safe(obj.learning_methods),
        learning_courses=obj.learning_courses,
        rotation_interest=obj.rotation_interest,
        rotation_target=obj.rotation_target,
        project_interests=_loads_list_safe(obj.project_interests),
        other_comments=obj.other_comments,
        created_at=obj.created_at,
        updated_at=obj.updated_at,
    )


@router.put("/me/development-intent", response_model=DevelopmentIntentResponse)
async def upsert_development_intent_me(
    body: DevelopmentIntentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = await _get_or_create_profile(db, current_user.id)
    result = await db.execute(
        select(DevelopmentIntent).where(DevelopmentIntent.profile_id == profile.id)
    )
    obj = result.scalar_one_or_none()
    data = body.model_dump(exclude_unset=True)
    # 序列化多选字段为 JSON 字符串存库
    for k in ("core_abilities", "learning_methods", "project_interests"):
        if k in data:
            data[k] = _dump_list_to_str(data[k])
    if not obj:
        obj = DevelopmentIntent(profile_id=profile.id, **data)
        db.add(obj)
    else:
        for k, v in data.items():
            setattr(obj, k, v)
    await db.flush()
    await db.refresh(obj)
    await log_operation(db, current_user.id, "upsert", "development_intent", str(profile.id), None)
    # 手动构造响应：把 JSON 字符串字段反序列化为 list
    def _loads_list_safe(v):
        if v is None or v == "":
            return []
        if isinstance(v, list):
            return v
        try:
            parsed = _json.loads(v)
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []
    return DevelopmentIntentResponse(
        id=obj.id,
        profile_id=obj.profile_id,
        development_path=obj.development_path,
        short_term_goal=obj.short_term_goal,
        mid_term_goal=obj.mid_term_goal,
        core_abilities=_loads_list_safe(obj.core_abilities),
        learning_methods=_loads_list_safe(obj.learning_methods),
        learning_courses=obj.learning_courses,
        rotation_interest=obj.rotation_interest,
        rotation_target=obj.rotation_target,
        project_interests=_loads_list_safe(obj.project_interests),
        other_comments=obj.other_comments,
        created_at=obj.created_at,
        updated_at=obj.updated_at,
    )


# ===================== Step 1 1.4: 项目总结 CRUD（含技能标签多对多） =====================

async def _replace_project_tags(db: AsyncSession, project: ProjectSummary, tag_ids: list[int]) -> None:
    """替换项目关联的技能标签：先删旧关联再批量插入"""
    from sqlalchemy import delete as sql_delete
    await db.execute(
        sql_delete(ProjectSummaryTag).where(ProjectSummaryTag.project_id == project.id)
    )
    for tid in tag_ids:
        db.add(ProjectSummaryTag(project_id=project.id, tag_id=tid))
    await db.flush()


async def _build_project_response(db: AsyncSession, project: ProjectSummary) -> ProjectSummaryResponse:
    """加载项目关联的标签，构造响应对象"""
    result = await db.execute(
        select(ProjectSummaryTag).where(ProjectSummaryTag.project_id == project.id)
    )
    ptags = result.scalars().all()
    tag_ids = [t.tag_id for t in ptags]
    tag_names: list[str] = []
    if tag_ids:
        tag_result = await db.execute(
            select(SkillTagTemplate).where(SkillTagTemplate.id.in_(tag_ids))
        )
        tags = tag_result.scalars().all()
        tag_names = [t.name for t in tags]
    return ProjectSummaryResponse(
        id=project.id,
        profile_id=project.profile_id,
        project_name=project.project_name,
        start_time=project.start_time,
        end_time=project.end_time,
        role=project.role,
        description=project.description,
        tag_ids=tag_ids,
        tag_names=tag_names,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.post("/me/project-summary", response_model=ProjectSummaryResponse)
async def create_project_summary_me(
    body: ProjectSummaryCreate,
    ehr_no: Optional[str] = Query(None, description="目标 EHR（管理员/组长代填时使用）"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, ehr_no)
    start_time = validate_date(body.start_time)
    end_time = validate_date(body.end_time) if body.end_time else None
    obj = ProjectSummary(
        profile_id=profile.id,
        project_name=body.project_name,
        start_time=start_time,
        end_time=end_time,
        role=body.role,
        description=body.description,
    )
    db.add(obj)
    await db.flush()
    if body.tag_ids:
        await _replace_project_tags(db, obj, body.tag_ids)
    await log_operation(db, current_user.id, "create", "project_summary", str(obj.id), None)
    return await _build_project_response(db, obj)


@router.put("/me/project-summary/{item_id}", response_model=ProjectSummaryResponse)
async def update_project_summary_me(
    item_id: int,
    body: ProjectSummaryUpdate,
    ehr_no: Optional[str] = Query(None, description="目标 EHR（管理员/组长代填时使用）"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, ehr_no)
    result = await db.execute(
        select(ProjectSummary).where(
            ProjectSummary.id == item_id,
            ProjectSummary.profile_id == profile.id,
        )
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    data = body.model_dump(exclude_unset=True)
    tag_ids = data.pop("tag_ids", None)
    for k, v in data.items():
        if k in ("start_time", "end_time") and v is not None:
            v = validate_date(v)
        setattr(obj, k, v)
    db.add(obj)
    await db.flush()
    if tag_ids is not None:
        await _replace_project_tags(db, obj, tag_ids)
    await log_operation(db, current_user.id, "update", "project_summary", str(item_id), None)
    return await _build_project_response(db, obj)


@router.delete("/me/project-summary/{item_id}")
async def delete_project_summary_me(
    item_id: int,
    ehr_no: Optional[str] = Query(None, description="目标 EHR（管理员/组长代填时使用）"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile, _ = await _resolve_profile_id(db, current_user, ehr_no)
    result = await db.execute(
        select(ProjectSummary).where(
            ProjectSummary.id == item_id,
            ProjectSummary.profile_id == profile.id,
        )
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    await db.delete(obj)
    await log_operation(db, current_user.id, "delete", "project_summary", str(item_id), None)
    return {"message": "ok"}
