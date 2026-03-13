# 首次初始化数据库并创建管理员（可选）
import asyncio
from app.database import engine, AsyncSessionLocal, Base
from app.models import User
from app.auth import hash_password


async def init():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        r = await db.execute(select(User).where(User.ehr_no == "admin"))
        if r.scalar_one_or_none() is None:
            u = User(
                ehr_no="admin",
                name="系统管理员",
                group_name="管理组",
                role="admin",
                password_hash=hash_password("1234567"),
            )
            db.add(u)
            await db.commit()
            print("已创建默认管理员: ehr=admin, 密码=1234567")
        else:
            print("管理员已存在，跳过")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(init())
