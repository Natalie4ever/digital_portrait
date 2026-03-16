# 为 reward_info 表添加新列（已有数据库升级用，按需执行）
import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "digital_portrait.db")

NEW_COLUMNS = [
    ("reward_type", "VARCHAR(20)"),
    ("reward_reason", "VARCHAR(500)"),
]


def main():
    if not os.path.exists(DB_PATH):
        print("数据库文件不存在，无需迁移")
        return
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(reward_info)")
    existing = {row[1] for row in cur.fetchall()}
    for name, typ in NEW_COLUMNS:
        if name in existing:
            print(f"已存在列 {name}，跳过")
            continue
        cur.execute(f"ALTER TABLE reward_info ADD COLUMN {name} {typ}")
        print(f"已添加列 {name}")
    conn.commit()
    conn.close()
    print("迁移完成")


if __name__ == "__main__":
    main()
