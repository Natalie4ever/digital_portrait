# Pydantic 请求/响应模型
from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


def _validate_ehr_no(v: str) -> str:
    from app.validators import validate_ehr_no
    return validate_ehr_no(v)


# ----- 认证 -----
class LoginRequest(BaseModel):
    ehr_no: str
    password: str

    @field_validator("ehr_no")
    @classmethod
    def ehr_no_seven_digits(cls, v: str) -> str:
        return _validate_ehr_no(v)


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

    @field_validator("ehr_no")
    @classmethod
    def ehr_no_seven_digits(cls, v: str) -> str:
        return _validate_ehr_no(v)


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
    is_emergency_staff: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    total: int
    items: list[UserResponse]


class ProfileListItem(BaseModel):
    ehr_no: str
    name: str
    group_name: str
    role: str
    tags: list[str] = []
    commute_minutes: Optional[int] = None
    is_emergency_staff: bool = False


class ProfileListResponse(BaseModel):
    total: int
    items: list[ProfileListItem]


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
    # Step 1 1.1: 应急先锋队标识
    is_emergency_staff: Optional[bool] = None


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
    education_category: Optional[str] = None
    education_type: Optional[str] = None
    education_level: Optional[str] = None
    degree: Optional[str] = None
    school: Optional[str] = None
    major_name: Optional[str] = None
    duration_years: Optional[str] = None
    enrollment_date: Optional[date] = None
    graduation_date: Optional[date] = None
    completion_status: Optional[str] = None
    country: Optional[str] = None


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
    name: Optional[str] = None
    gender: Optional[str] = None
    relation: Optional[str] = None
    birth_date: Optional[date] = None
    work_unit_and_title: Optional[str] = None
    political_status: Optional[str] = None
    employment_status: Optional[str] = None


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
    reward_type: Optional[str] = None
    reward_time: Optional[date] = None
    reward_name: Optional[str] = None
    reward_reason: Optional[str] = None


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
    # Step 1 1.2: 证书有效期（可选）
    valid_until: Optional[date] = None


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
    cert_level_or_score: Optional[str] = None


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


# ====== Step 1 1.3（修订版）: 发展意向 - 1:1 单表 ======
class DevelopmentIntentBase(BaseModel):
    # 第一部分：职业发展方向
    development_path: Optional[str] = None
    short_term_goal: Optional[str] = None
    mid_term_goal: Optional[str] = None
    # 第二部分：能力提升与学习需求
    core_abilities: Optional[list[str]] = None    # 多选
    learning_methods: Optional[list[str]] = None  # 多选
    learning_courses: Optional[str] = None
    # 第三部分：实践机会意向
    rotation_interest: Optional[str] = None       # 是/否
    rotation_target: Optional[str] = None
    project_interests: Optional[list[str]] = None  # 多选
    # 第四部分：其他补充
    other_comments: Optional[str] = None


class DevelopmentIntentUpdate(DevelopmentIntentBase):
    pass


class DevelopmentIntentResponse(DevelopmentIntentBase):
    id: int
    profile_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ====== Step 1 1.4: 项目总结（子表 + 标签中间表）======
class ProjectSummaryCreate(BaseModel):
    project_name: str
    start_time: date
    end_time: Optional[date] = None
    role: Optional[str] = None
    description: Optional[str] = None
    tag_ids: Optional[list[int]] = None  # 多对多关联 skill_tag_templates.id


class ProjectSummaryUpdate(BaseModel):
    project_name: Optional[str] = None
    start_time: Optional[date] = None
    end_time: Optional[date] = None
    role: Optional[str] = None
    description: Optional[str] = None
    tag_ids: Optional[list[int]] = None


class ProjectSummaryResponse(BaseModel):
    id: int
    profile_id: int
    project_name: str
    start_time: date
    end_time: Optional[date] = None
    role: Optional[str] = None
    description: Optional[str] = None
    tag_ids: list[int] = []  # 关联的技能标签 id 列表
    tag_names: list[str] = []  # 关联的技能标签名称列表（便于前端展示）
    created_at: datetime
    updated_at: datetime

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
    # Step 1: 发展意向 1:1 + 项目总结
    development_intent: Optional[DevelopmentIntentResponse] = None
    project_summaries: list[ProjectSummaryResponse] = []


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

    @field_validator("ehr_no")
    @classmethod
    def ehr_no_seven_digits(cls, v: str) -> str:
        return _validate_ehr_no(v)


# ----- 家访记录 -----
TEAM_NAME_FIXED = "审核处理团队"


class HomeVisitRecordCreate(BaseModel):
    visited_ehr_no: str
    visit_year: int
    visit_time: datetime
    visit_method: str  # 线上/线下
    visit_address: Optional[str] = None
    visitor_info: Optional[str] = None
    is_visited: bool = False
    visit_date: Optional[date] = None
    position: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    mobile: Optional[str] = None
    home_phone: Optional[str] = None
    family1_name: Optional[str] = None
    family1_relation: Optional[str] = None
    family1_contact: Optional[str] = None
    family1_work_unit: Optional[str] = None
    family2_name: Optional[str] = None
    family2_relation: Optional[str] = None
    family2_contact: Optional[str] = None
    family2_work_unit: Optional[str] = None
    feedback: Optional[str] = None

    @field_validator("visited_ehr_no")
    @classmethod
    def ehr_no_seven_digits(cls, v: str) -> str:
        return _validate_ehr_no(v)


class HomeVisitRecordUpdate(BaseModel):
    visit_year: Optional[int] = None
    visit_time: Optional[datetime] = None
    visit_method: Optional[str] = None
    visit_address: Optional[str] = None
    visitor_info: Optional[str] = None
    is_visited: Optional[bool] = None
    visit_date: Optional[date] = None
    position: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    mobile: Optional[str] = None
    home_phone: Optional[str] = None
    family1_name: Optional[str] = None
    family1_relation: Optional[str] = None
    family1_contact: Optional[str] = None
    family1_work_unit: Optional[str] = None
    family2_name: Optional[str] = None
    family2_relation: Optional[str] = None
    family2_contact: Optional[str] = None
    family2_work_unit: Optional[str] = None
    feedback: Optional[str] = None


class HomeVisitRecordListItem(BaseModel):
    id: int
    visited_ehr_no: str
    visited_name: str
    position: Optional[str] = None
    visit_year: int
    visit_time: datetime
    visit_method: str
    is_visited: bool
    created_at: datetime

    class Config:
        from_attributes = True


class HomeVisitRecordDetailResponse(BaseModel):
    id: int
    visited_user_id: int
    visited_ehr_no: str
    visited_name: str
    visitor_user_id: int
    visitor_name: str
    visit_year: int
    visit_time: datetime
    visit_method: str
    visit_address: Optional[str] = None
    visitor_info: Optional[str] = None
    is_visited: bool
    visit_date: Optional[date] = None
    position: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    mobile: Optional[str] = None
    home_phone: Optional[str] = None
    family1_name: Optional[str] = None
    family1_relation: Optional[str] = None
    family1_contact: Optional[str] = None
    family1_work_unit: Optional[str] = None
    family2_name: Optional[str] = None
    family2_relation: Optional[str] = None
    family2_contact: Optional[str] = None
    family2_work_unit: Optional[str] = None
    feedback: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HomeVisitRecordListResponse(BaseModel):
    total: int
    items: list[HomeVisitRecordListItem]


# ====== Step 2: 组员调换历史 ======
class GroupTransferRequest(BaseModel):
    ehr_no: str
    to_group: str
    transfer_date: Optional[datetime] = None  # 默认 = 当前时间
    reason: Optional[str] = None
    remark: Optional[str] = None

    @field_validator("ehr_no")
    @classmethod
    def ehr_no_seven_digits(cls, v: str) -> str:
        return _validate_ehr_no(v)


class GroupTransferResponse(BaseModel):
    id: int
    user_id: int
    ehr_no: str
    user_name: Optional[str] = None
    from_group: Optional[str] = None
    to_group: str
    transfer_date: datetime
    leave_date: Optional[datetime] = None
    operator_user_id: int
    operator_ehr_no: str
    operator_name: str
    reason: Optional[str] = None
    remark: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class GroupTransferListItem(BaseModel):
    """列表项：合并员工姓名"""
    id: int
    ehr_no: str
    user_name: Optional[str] = None
    from_group: Optional[str] = None
    to_group: str
    transfer_date: datetime
    leave_date: Optional[datetime] = None
    operator_ehr_no: str
    operator_name: str
    reason: Optional[str] = None
    remark: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class GroupTransferListResponse(BaseModel):
    total: int
    items: list[GroupTransferListItem]


class GroupListResponse(BaseModel):
    items: list[str]


# ====== Step 3: 智能筛选四大场景 ======
class ScenarioSearchRequest(BaseModel):
    scenario: str  # emergency | activity | project | transfer
    # 通用筛选
    group_name: Optional[str] = None
    role: Optional[str] = None
    include_disabled: bool = False
    # 应急响应
    max_commute_minutes: Optional[int] = None
    # 活动选人
    interest_tags: Optional[list[str]] = None
    # 项目组队
    required_skill_tags: Optional[list[str]] = None
    min_cert_count: Optional[int] = None
    min_project_count: Optional[int] = None
    # 人员调配
    target_group: Optional[str] = None


class ScenarioSearchItem(BaseModel):
    ehr_no: str
    name: str
    group_name: str
    role: str
    is_emergency_staff: bool = False
    commute_minutes: Optional[int] = None
    skill_tags: list[str] = []
    cert_count: int = 0
    project_count: int = 0
    match_score: float = 0.0
    matched_tags: list[str] = []         # 命中的标签
    has_required_skills: bool = False
    has_interests: bool = False


class ScenarioSearchResponse(BaseModel):
    total: int
    items: list[ScenarioSearchItem]
    scenario: str


# ====== Step 4: 团队能力分析 ======
class SkillCountItem(BaseModel):
    skill_name: str
    count: int
    holders: list[str] = []  # EHR 列表


class SkillDistributionResponse(BaseModel):
    items: list[SkillCountItem]
    total_employees: int


class GroupDensityItem(BaseModel):
    group_name: str
    count: int
    is_emergency_count: int = 0


class OverviewResponse(BaseModel):
    skills: list[SkillCountItem] = []
    groups: list[GroupDensityItem] = []
    total_employees: int = 0


class CertificateStatItem(BaseModel):
    cert_name: str
    count: int
    holders: list[str] = []


class CertificateStatResponse(BaseModel):
    items: list[CertificateStatItem]
    total_certs: int = 0


class RiskWarningItem(BaseModel):
    level: str  # red | yellow | green
    type: str   # skill | emergency
    title: str
    description: str = ""
    details: list[str] = []


class RisksResponse(BaseModel):
    items: list[RiskWarningItem]
    red_count: int = 0
    yellow_count: int = 0
    green_count: int = 0


class EmergencyStatItem(BaseModel):
    bucket: str
    count: int


class EmergencyStatsResponse(BaseModel):
    items: list[EmergencyStatItem]
    total_emergency: int = 0
    total_employees: int = 0
    coverage_rate: float = 0.0
