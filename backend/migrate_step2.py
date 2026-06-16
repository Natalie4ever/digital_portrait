# Step 2 迁移脚本：建 group_transfer_history 表 + 为现有用户回填入职记录
# 执行：python backend/migrate_step2.py
import sys
import asyncio
sys.stdout.reconfigure(encoding='utf-8')
from sqlalchemy import text
from app.database import engine, Base, AsyncSessionLocal
import app.models  # noqa: F401


async def migrate():
    # 1. 建表（Base.metadata.create_all 会自动建新表）
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] group_transfer_history 表已建（如果不存在）")

    # 2. 回填"入职记录"：为每个用户写一条 from_group=NULL、to_group=当前组别、leave_date=NULL
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        from app.models import User, GroupTransferHistory
        users = (await db.execute(
            select(User).where(User.deleted_at.is_(None))
        )).scalars().all()

        added = 0
        for u in users:
            exists = (await db.execute(
                select(GroupTransferHistory).where(GroupTransferHistory.user_id == u.id).limit(1)
            )).scalar_one_or_none()
            if exists:
                continue
            db.add(GroupTransferHistory(
                user_id=u.id,
                ehr_no=u.ehr_no,
                from_group=None,
                to_group=u.group_name or "未分组",
                transfer_date=u.created_at or __import__('datetime').datetime.utcnow(),
                leave_date=None,
                operator_user_id=u.id,            # 入职无操作人，用自己占位
                operator_ehr_no=u.ehr_no,
                operator_name=u.name or "系统初始化",
                reason="初始入组",
                remark="系统回填",
            ))
            added += 1
        await db.commit()
        print(f"[OK] 已为 {added} 个用户回填入职记录（已存在则跳过）")

    await engine.dispose()
    print("[DONE] Step 2 迁移完成")


if __name__ == "__main__":
    asyncio.run(migrate())
