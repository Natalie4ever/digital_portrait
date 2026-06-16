# 数据模型：字段类型兼容 SQLite 与 SQL Server
from datetime import date, datetime
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    ehr_no = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    group_name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False, default="user")
    password_hash = Column(String(255), nullable=False)
    is_disabled = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    profile = relationship("Profile", back_populates="user", uselist=False)
    operation_logs = relationship("OperationLog", back_populates="user", foreign_keys="OperationLog.user_id")

    @property
    def is_emergency_staff(self) -> bool:
        """便捷访问：用户是否应急先锋队（来自 profile.is_emergency_staff）"""
        try:
            return bool(self.profile and self.profile.is_emergency_staff)
        except Exception:
            return False


class Profile(Base):
    __tablename__ = "profiles"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    gender = Column(String(10), nullable=True)
    nation = Column(String(50), nullable=True)
    birth_date = Column(Date, nullable=True)
    job_title = Column(String(200), nullable=True)
    id_type = Column(String(50), nullable=True)
    id_number = Column(String(50), nullable=True)
    native_place = Column(String(200), nullable=True)
    birth_place = Column(String(200), nullable=True)
    household_place = Column(String(200), nullable=True)
    work_start_date = Column(Date, nullable=True)
    hire_date = Column(Date, nullable=True)
    marital_status = Column(String(20), nullable=True)
    # Step 1 1.1: 应急先锋队标识
    is_emergency_staff = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="profile")
    political = relationship("PoliticalInfo", back_populates="profile", order_by="PoliticalInfo.join_date")
    education = relationship("EducationInfo", back_populates="profile")
    family = relationship("FamilyInfo", back_populates="profile")
    resume = relationship("ResumeInfo", back_populates="profile", order_by="ResumeInfo.start_time")
    reward = relationship("RewardInfo", back_populates="profile", order_by="RewardInfo.reward_time")
    qualification = relationship("QualificationInfo", back_populates="profile", order_by="QualificationInfo.obtain_time")
    achievement = relationship("AchievementInfo", back_populates="profile", order_by="AchievementInfo.obtain_time")
    language = relationship("LanguageInfo", back_populates="profile")
    contact = relationship("ContactInfo", back_populates="profile", uselist=False)
    skill_tags = relationship("ProfileSkillTag", back_populates="profile")
    # Step 1 1.3（修订版）: 发展意向 1:1 单表 + 项目总结
    development_intent = relationship("DevelopmentIntent", back_populates="profile", uselist=False, cascade="all, delete-orphan")
    project_summaries = relationship("ProjectSummary", back_populates="profile", cascade="all, delete-orphan")


class PoliticalInfo(Base):
    __tablename__ = "political_info"
    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"), nullable=False)
    political_status = Column(String(50), nullable=True)
    join_date = Column(Date, nullable=True)
    introducer = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    profile = relationship("Profile", back_populates="political")


class EducationInfo(Base):
    __tablename__ = "education_info"
    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"), nullable=False)
    education_category = Column(String(50), nullable=True)  # 教育类别：全日制教育、在职教育
    education_type = Column(String(50), nullable=True)  # 教育类型：国民教育、党校教育、军队教育
    education_level = Column(String(50), nullable=True)  # 学历
    degree = Column(String(50), nullable=True)  # 学位
    school = Column(String(200), nullable=True)  # 毕业学校
    major_name = Column(String(200), nullable=True)  # 专业名称
    duration_years = Column(String(20), nullable=True)  # 学制（年）
    enrollment_date = Column(Date, nullable=True)  # 入学时间
    graduation_date = Column(Date, nullable=True)  # 毕业时间
    completion_status = Column(String(50), nullable=True)  # 学习完成情况
    country = Column(String(100), nullable=True)  # 学历授予国家（地区）
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    profile = relationship("Profile", back_populates="education")


class FamilyInfo(Base):
    __tablename__ = "family_info"
    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"), nullable=False)
    name = Column(String(100), nullable=True)  # 亲属姓名
    gender = Column(String(10), nullable=True)  # 亲属性别
    relation = Column(String(50), nullable=True)  # 亲属与本人关系
    birth_date = Column(Date, nullable=True)  # 亲属出生日期
    work_unit_and_title = Column(String(500), nullable=True)  # 亲属工作单位及职位
    political_status = Column(String(50), nullable=True)  # 亲属政治面貌
    employment_status = Column(String(50), nullable=True)  # 人员状况
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    profile = relationship("Profile", back_populates="family")


class ResumeInfo(Base):
    __tablename__ = "resume_info"
    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"), nullable=False)
    start_time = Column(Date, nullable=True)
    end_time = Column(Date, nullable=True)
    unit_and_title = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    profile = relationship("Profile", back_populates="resume")


class RewardInfo(Base):
    __tablename__ = "reward_info"
    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"), nullable=False)
    reward_type = Column(String(20), nullable=True)  # 奖励、惩罚
    reward_time = Column(Date, nullable=True)
    reward_name = Column(String(300), nullable=True)
    reward_reason = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    profile = relationship("Profile", back_populates="reward")


class QualificationInfo(Base):
    __tablename__ = "qualification_info"
    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"), nullable=False)
    qualification_name = Column(String(200), nullable=True)
    obtain_time = Column(Date, nullable=True)
    # Step 1 1.2: 证书有效期
    valid_until = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    profile = relationship("Profile", back_populates="qualification")


class AchievementInfo(Base):
    __tablename__ = "achievement_info"
    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"), nullable=False)
    achievement_name = Column(String(300), nullable=True)
    obtain_time = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    profile = relationship("Profile", back_populates="achievement")


class LanguageInfo(Base):
    __tablename__ = "language_info"
    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"), nullable=False)
    language = Column(String(50), nullable=True)
    proficiency = Column(String(50), nullable=True)
    cert_level_or_score = Column(String(200), nullable=True)  # 语言能力证书级别/分数
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    profile = relationship("Profile", back_populates="language")


class ContactInfo(Base):
    __tablename__ = "contact_info"
    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"), unique=True, nullable=False)
    mobile = Column(String(20), nullable=True)
    office_phone = Column(String(20), nullable=True)
    home_phone = Column(String(20), nullable=True)
    home_address = Column(String(500), nullable=True)
    email = Column(String(100), nullable=True)
    commute_minutes = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    profile = relationship("Profile", back_populates="contact")


# Step 1 1.3（修订版）: 发展意向 - 1:1 单表，按银行后台岗位发展意向表单设计
# 4 个部分：职业发展方向 / 能力提升与学习需求 / 实践机会意向 / 其他补充
class DevelopmentIntent(Base):
    __tablename__ = "development_intent"
    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), unique=True, nullable=False)

    # 第一部分：职业发展方向
    development_path = Column(String(50), nullable=True)       # 发展序列偏好：专业深耕/管理发展/横向拓展/项目创新
    short_term_goal = Column(Text, nullable=True)              # 短期目标（1年内）
    mid_term_goal = Column(Text, nullable=True)                # 中长期目标（2-3年）

    # 第二部分：能力提升与学习需求
    core_abilities = Column(Text, nullable=True)               # 核心能力提升（多选，JSON 数组字符串）
    learning_methods = Column(Text, nullable=True)             # 学习方式（多选，JSON 数组字符串）
    learning_courses = Column(Text, nullable=True)             # 希望学习课程/认证

    # 第三部分：实践机会意向
    rotation_interest = Column(String(20), nullable=True)      # 是否愿意轮岗借调：是/否
    rotation_target = Column(String(200), nullable=True)      # 感兴趣部门
    project_interests = Column(Text, nullable=True)            # 项目参与意向（多选，JSON 数组字符串）

    # 第四部分：其他补充
    other_comments = Column(Text, nullable=True)               # 其他补充

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    profile = relationship("Profile", back_populates="development_intent")


# Step 1 1.4: 项目总结（子表 + 技能标签中间表）
class ProjectSummary(Base):
    __tablename__ = "project_summary"
    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    project_name = Column(String(200), nullable=False)
    start_time = Column(Date, nullable=False)
    end_time = Column(Date, nullable=True)
    role = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    profile = relationship("Profile", back_populates="project_summaries")
    tags = relationship("ProjectSummaryTag", back_populates="project", cascade="all, delete-orphan")


class ProjectSummaryTag(Base):
    __tablename__ = "project_summary_tags"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("project_summary.id", ondelete="CASCADE"), nullable=False)
    tag_id = Column(Integer, ForeignKey("skill_tag_templates.id", ondelete="CASCADE"), nullable=False)
    project = relationship("ProjectSummary", back_populates="tags")
    tag = relationship("SkillTagTemplate")
    __table_args__ = (UniqueConstraint("project_id", "tag_id", name="uq_project_tag"),)


# 预定义技能标签
class SkillTagTemplate(Base):
    __tablename__ = "skill_tag_templates"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# 用户档案-技能标签（多对多，支持预定义+自定义，自定义即不在 template 里）
class ProfileSkillTag(Base):
    __tablename__ = "profile_skill_tags"
    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"), nullable=False)
    tag_name = Column(String(100), nullable=False)
    template_id = Column(Integer, ForeignKey("skill_tag_templates.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    profile = relationship("Profile", back_populates="skill_tags")


class OperationLog(Base):
    __tablename__ = "operation_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False)
    resource = Column(String(100), nullable=True)
    detail = Column(Text, nullable=True)
    ip = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="operation_logs", foreign_keys=[user_id])


# 家访记录：组长对组员家访，团队名称固定为「审核处理团队」
class HomeVisitRecord(Base):
    __tablename__ = "home_visit_records"
    id = Column(Integer, primary_key=True, autoincrement=True)
    visited_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    visitor_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    visit_year = Column(Integer, nullable=False)
    visit_time = Column(DateTime, nullable=False)
    visit_method = Column(String(20), nullable=False)  # 线上/线下
    visit_address = Column(String(500), nullable=True)
    visitor_info = Column(String(500), nullable=True)
    is_visited = Column(Boolean, default=False)

    visit_date = Column(Date, nullable=True)
    position = Column(String(200), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    address = Column(String(500), nullable=True)
    mobile = Column(String(20), nullable=True)
    home_phone = Column(String(20), nullable=True)

    family1_name = Column(String(100), nullable=True)
    family1_relation = Column(String(50), nullable=True)
    family1_contact = Column(String(50), nullable=True)
    family1_work_unit = Column(String(300), nullable=True)

    family2_name = Column(String(100), nullable=True)
    family2_relation = Column(String(50), nullable=True)
    family2_contact = Column(String(50), nullable=True)
    family2_work_unit = Column(String(300), nullable=True)

    feedback = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    visited_user = relationship("User", foreign_keys=[visited_user_id])
    visitor_user = relationship("User", foreign_keys=[visitor_user_id])


# ====== Step 2: 组员调换历史表 ======
class GroupTransferHistory(Base):
    """记录员工每次组别调换：调入时间、离开时间、操作人等。leave_date IS NULL 表示当前仍在该组。"""
    __tablename__ = "group_transfer_history"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    ehr_no = Column(String(50), nullable=False, index=True)
    from_group = Column(String(100), nullable=True)        # 调离组别（首条为 NULL）
    to_group = Column(String(100), nullable=False)         # 调入组别
    transfer_date = Column(DateTime, nullable=False)        # 加入新组的时间
    leave_date = Column(DateTime, nullable=True, index=True)  # 离开时间（NULL=当前仍在该组）
    operator_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    operator_ehr_no = Column(String(50), nullable=False)   # 冗余便于历史快照
    operator_name = Column(String(100), nullable=False)    # 冗余便于历史快照
    reason = Column(String(500), nullable=True)            # 调组原因
    remark = Column(String(500), nullable=True)            # 备注
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    operator = relationship("User", foreign_keys=[operator_user_id])
