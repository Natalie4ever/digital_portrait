# Pydantic 请求/响应模型
from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


# ----- 认证 -----
class LoginRequest(BaseModel):
    ehr_no: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expire_minutes: int


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


# ----- 用户（列表/详情，管理员用）-----
class UserCreate(BaseModel):
    ehr_no: str
    name: str
    group_name: str
    role: str = "user"
    initial_password: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    group_name: Optional[str] = None
    role: Optional[str] = None
    is_disabled: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    ehr_no: str
    name: str
    group_name: str
    role: str
    is_disabled: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    total: int
    items: list[UserResponse]


# ----- 档案基础信息 -----
class ProfileBaseUpdate(BaseModel):
    gender: Optional[str] = None
    nation: Optional[str] = None
    birth_date: Optional[date] = None
    job_title: Optional[str] = None
    id_type: Optional[str] = None
    id_number: Optional[str] = None
    native_place: Optional[str] = None
    birth_place: Optional[str] = None
    household_place: Optional[str] = None
    work_start_date: Optional[date] = None
    hire_date: Optional[date] = None
    marital_status: Optional[str] = None


# ----- 政治面貌 -----
class PoliticalInfoCreate(BaseModel):
    political_status: Optional[str] = None
    join_date: Optional[date] = None
    introducer: Optional[str] = None


class PoliticalInfoUpdate(PoliticalInfoCreate):
    pass


class PoliticalInfoResponse(PoliticalInfoCreate):
    id: int
    profile_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ----- 学历学位 -----
class EducationInfoCreate(BaseModel):
    degree: Optional[str] = None
    education_level: Optional[str] = None
    education_type: Optional[str] = None
    school: Optional[str] = None


class EducationInfoUpdate(EducationInfoCreate):
    pass


class EducationInfoResponse(EducationInfoCreate):
    id: int
    profile_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ----- 家庭关系 -----
class FamilyInfoCreate(BaseModel):
    relation: Optional[str] = None
    name: Optional[str] = None
    birth_date: Optional[date] = None
    work_unit_and_title: Optional[str] = None


class FamilyInfoUpdate(FamilyInfoCreate):
    pass


class FamilyInfoResponse(FamilyInfoCreate):
    id: int
    profile_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ----- 简历 -----
class ResumeInfoCreate(BaseModel):
    start_time: Optional[date] = None
    end_time: Optional[date] = None
    unit_and_title: Optional[str] = None


class ResumeInfoUpdate(ResumeInfoCreate):
    pass


class ResumeInfoResponse(ResumeInfoCreate):
    id: int
    profile_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ----- 奖惩 -----
class RewardInfoCreate(BaseModel):
    reward_time: Optional[date] = None
    reward_name: Optional[str] = None


class RewardInfoUpdate(RewardInfoCreate):
    pass


class RewardInfoResponse(RewardInfoCreate):
    id: int
    profile_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ----- 外部资格 -----
class QualificationInfoCreate(BaseModel):
    qualification_name: Optional[str] = None
    obtain_time: Optional[date] = None


class QualificationInfoUpdate(QualificationInfoCreate):
    pass


class QualificationInfoResponse(QualificationInfoCreate):
    id: int
    profile_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ----- 专业成果 -----
class AchievementInfoCreate(BaseModel):
    achievement_name: Optional[str] = None
    obtain_time: Optional[date] = None


class AchievementInfoUpdate(AchievementInfoCreate):
    pass


class AchievementInfoResponse(AchievementInfoCreate):
    id: int
    profile_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ----- 语言能力 -----
class LanguageInfoCreate(BaseModel):
    language: Optional[str] = None
    proficiency: Optional[str] = None


class LanguageInfoUpdate(LanguageInfoCreate):
    pass


class LanguageInfoResponse(LanguageInfoCreate):
    id: int
    profile_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ----- 通讯 -----
class ContactInfoCreate(BaseModel):
    mobile: Optional[str] = None
    office_phone: Optional[str] = None
    home_phone: Optional[str] = None
    home_address: Optional[str] = None
    email: Optional[str] = None
    commute_minutes: Optional[int] = None


class ContactInfoUpdate(ContactInfoCreate):
    pass


class ContactInfoResponse(ContactInfoCreate):
    id: int
    profile_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ----- 技能标签 -----
class ProfileSkillTagCreate(BaseModel):
    tag_name: str
    template_id: Optional[int] = None


class ProfileSkillTagResponse(BaseModel):
    id: int
    profile_id: int
    tag_name: str
    template_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ----- 技能标签模板（预定义）-----
class SkillTagTemplateCreate(BaseModel):
    name: str


class SkillTagTemplateResponse(BaseModel):
    id: int
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


# ----- 档案完整响应 -----
class ProfileFullResponse(BaseModel):
    user_id: int
    ehr_no: str
    name: str
    group_name: str
    base: Optional[ProfileBaseUpdate] = None
    political: list[PoliticalInfoResponse] = []
    education: list[EducationInfoResponse] = []
    family: list[FamilyInfoResponse] = []
    resume: list[ResumeInfoResponse] = []
    reward: list[RewardInfoResponse] = []
    qualification: list[QualificationInfoResponse] = []
    achievement: list[AchievementInfoResponse] = []
    language: list[LanguageInfoResponse] = []
    contact: Optional[ContactInfoResponse] = None
    skill_tags: list[ProfileSkillTagResponse] = []


# ----- 操作日志 -----
class OperationLogResponse(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    user_ehr: Optional[str] = None
    action: str
    resource: Optional[str] = None
    detail: Optional[str] = None
    ip: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AdminResetPasswordRequest(BaseModel):
    ehr_no: str
    new_password: str
