# 个人信息维护：基础信息与各子表增删改查，权限：本人/组长看组员/管理员看全部
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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
)
from app.auth import get_current_user
from app.validators import validate_id_number, validate_mobile, validate_phone, validate_date
from app.operation_log import log_operation

router = APIRouter(prefix="/api/profile", tags=["个人档案"])


def _can_access(viewer: User, target: User) -> bool:
    if viewer.role == "admin":
        return True
    if viewer.role == "leader" and viewer.group_name and viewer.group_name == target.group_name:
        return True
    if viewer.ehr_no == target.ehr_no:
        return True
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
    target = await _get_target_user(db, ehr_no)
    if not target:
        raise HTTPException(status_code=404, detail="用户不存在")
    if not _can_access(current_user, target):
        raise HTTPException(status_code=403, detail="无权限查看该用户档案")
    return await _profile_response(db, target)


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
    target = await _get_target_user(db, ehr_no)
    if not target:
        raise HTTPException(status_code=404, detail="用户不存在")
    if not _can_access(current_user, target) or current_user.ehr_no != target.ehr_no:
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
    if ehr_no:
        target = await _get_target_user(db, ehr_no)
        if not target:
            raise HTTPException(status_code=404, detail="用户不存在")
        if not _can_access(current_user, target) or current_user.ehr_no != target.ehr_no:
            raise HTTPException(status_code=403, detail="仅本人可修改自己的档案")
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
    obj = RewardInfo(profile_id=profile.id, reward_time=reward_time, reward_name=body.reward_name)
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
    obj = QualificationInfo(profile_id=profile.id, qualification_name=body.qualification_name, obtain_time=obtain_time)
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
        if k == "obtain_time" and v is not None:
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
    obj = LanguageInfo(profile_id=profile.id, language=body.language, proficiency=body.proficiency)
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
