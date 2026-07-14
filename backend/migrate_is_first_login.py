# 存量用户 is_first_login 字段迁移脚本
# 将所有存量用户的 is_first_login 设置为 False，仅新用户需要强制修改密码
# 适用于 SQLite 数据库
import asyncio
from app.database import engine, AsyncSessionLocal, Base
from sqlalchemy import text, inspect


async def migrate():
    # 先创建表（如果不存在）
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 检查列是否存在
        result = await db.execute(text("PRAGMA table_info(users)"))
        columns = [row[1] for row in result.fetchall()]

        if 'is_first_login' not in columns:
            await db.execute(text("ALTER TABLE users ADD COLUMN is_first_login INTEGER DEFAULT 1"))
            await db.commit()
            print("已添加 is_first_login 列")
        else:
            print("is_first_login 列已存在，跳过添加列")

        # 将所有存量用户设置为 False（不强制修改密码）
        result = await db.execute(
            text("UPDATE users SET is_first_login = 0 WHERE is_first_login = 1 OR is_first_login IS NULL")
        )
        await db.commit()
        print(f"已更新 {result.rowcount} 条存量用户记录为非首次登录")

    await engine.dispose()
    print("迁移完成")


if __name__ == "__main__":
    asyncio.run(migrate())