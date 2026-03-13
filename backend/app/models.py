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
    degree = Column(String(50), nullable=True)
    education_level = Column(String(50), nullable=True)
    education_type = Column(String(50), nullable=True)
    school = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    profile = relationship("Profile", back_populates="education")


class FamilyInfo(Base):
    __tablename__ = "family_info"
    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"), nullable=False)
    relation = Column(String(50), nullable=True)
    name = Column(String(100), nullable=True)
    birth_date = Column(Date, nullable=True)
    work_unit_and_title = Column(String(500), nullable=True)
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
    reward_time = Column(Date, nullable=True)
    reward_name = Column(String(300), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    profile = relationship("Profile", back_populates="reward")


class QualificationInfo(Base):
    __tablename__ = "qualification_info"
    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"), nullable=False)
    qualification_name = Column(String(200), nullable=True)
    obtain_time = Column(Date, nullable=True)
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
