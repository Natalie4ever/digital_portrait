# 创建/更新所有表（用于添加新表）
import sys
import asyncio
sys.stdout.reconfigure(encoding='utf-8')
from app.database import engine, Base
import app.models  # noqa: F401 确保所有模型被注册

async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('[DONE] All tables ensured')
    await engine.dispose()

asyncio.run(main())
