"""迁移：users 表新增 is_superadmin 列，并将 ehr_no=0000001 设为 True"""
import asyncio
from sqlalchemy import text
from app.database import engine as async_engine


async def main():
    async with async_engine.begin() as conn:
        # 新增列（已存在则跳过）
        try:
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN is_superadmin BOOLEAN NOT NULL DEFAULT 0"
            ))
            print("已添加 is_superadmin 列")
        except Exception as e:
            print(f"列已存在或出错（跳过）: {e}")

        # 将 0000001 设为超级管理员
        result = await conn.execute(
            text("UPDATE users SET is_superadmin = 1 WHERE ehr_no = '0000001'")
        )
        print(f"已更新 {result.rowcount} 条记录为超级管理员")


if __name__ == "__main__":
    asyncio.run(main())
