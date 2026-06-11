# Step 1 1.3 修订版迁移：删除 3 个旧子表，保留 development_intent 新表
# 执行：python backend/migrate_step1_1_3.py
import asyncio
import sys
from sqlalchemy import text
from app.database import engine

# 解决 Windows GBK 控制台无法输出 emoji
sys.stdout.reconfigure(encoding='utf-8')


async def migrate():
    async with engine.begin() as conn:
        # 1. 删除旧子表（如果存在）
        for tbl in ("development_position", "development_direction", "development_plan"):
            try:
                await conn.execute(text(f"DROP TABLE IF EXISTS {tbl}"))
                print(f"[OK] 已删除旧表: {tbl}")
            except Exception as e:
                print(f"[WARN] 删除 {tbl} 失败: {e}")

        # 2. 新表 development_intent 由 Base.metadata.create_all 自动建
        # 3. profiles.is_emergency_staff 字段已存在，无需迁移
        # 4. qualification_info.valid_until 字段已存在，无需迁移
    await engine.dispose()
    print("[DONE] Step 1 1.3 修订版迁移完成")


if __name__ == "__main__":
    asyncio.run(migrate())
