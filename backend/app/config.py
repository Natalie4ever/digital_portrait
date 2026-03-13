# 使用与 SQL Server 兼容的类型与配置
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # 数据库：开发用 SQLite，迁移时改为 SQL Server 连接串
    DATABASE_URL: str = "sqlite+aiosqlite:///./digital_portrait.db"
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 小时无操作自动登出
    # 初始密码（导入无密码时）
    DEFAULT_PASSWORD: str = "1234567"

    class Config:
        env_file = ".env"


settings = Settings()
