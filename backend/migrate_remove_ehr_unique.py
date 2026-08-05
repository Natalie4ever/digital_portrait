"""
Migration: Remove UNIQUE constraint from users.ehr_no

Usage: python migrate_remove_ehr_unique.py
"""
import sqlite3
import shutil

DB_PATH = "./digital_portrait.db"
BACKUP_PATH = "./digital_portrait.db.backup"


def migrate():
    print("=" * 60)
    print("Migration: Remove UNIQUE constraint from users.ehr_no")
    print("=" * 60)

    # 1. Backup
    print(f"\n1. Backup database to {BACKUP_PATH}...")
    shutil.copy2(DB_PATH, BACKUP_PATH)
    print("[OK] Backup done")

    # 2. Check current state
    print("\n2. Check current index state...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("PRAGMA index_list('users')")
    indexes = cursor.fetchall()
    print(f"   Current indexes: {indexes}")

    ehr_unique_idx = None
    for idx in indexes:
        idx_name = idx[1]
        is_unique = idx[2]  # PRAGMA index_list: unique is column 2
        cursor.execute(f"PRAGMA index_info('{idx_name}')")
        cols = cursor.fetchall()
        if cols and 'ehr_no' in [c[2] for c in cols]:
            print(f"   EHR-related index: {idx_name}, UNIQUE={is_unique}")
            if is_unique == 1:
                ehr_unique_idx = idx_name

    if not ehr_unique_idx:
        print("   No EHR UNIQUE index found, migration may already be done")
        conn.close()
        return

    print(f"\n3. Found UNIQUE index to remove: {ehr_unique_idx}")

    # 4. Get table info
    print("\n4. Get table info...")
    cursor.execute(f"PRAGMA table_info('users')")
    columns = cursor.fetchall()
    print(f"   Columns: {[c[1] for c in columns]}")

    # 5. Export data
    print("\n5. Export data...")
    cursor.execute("SELECT * FROM users")
    rows = cursor.fetchall()
    print(f"   Total rows: {len(rows)}")

    # 6. Drop old table
    print("\n6. Drop old table...")
    cursor.execute("DROP TABLE users")
    print("   [OK] Old table dropped")

    # 7. Create new table (without UNIQUE constraint)
    print("\n7. Create new table (without UNIQUE constraint)...")
    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ehr_no VARCHAR(50) NOT NULL,
            name VARCHAR(100) NOT NULL,
            group_name VARCHAR(100) NOT NULL,
            role VARCHAR(20) NOT NULL DEFAULT 'user',
            password_hash VARCHAR(255) NOT NULL,
            is_disabled INTEGER NOT NULL DEFAULT 0,
            is_first_login INTEGER NOT NULL DEFAULT 1,
            is_superadmin INTEGER NOT NULL DEFAULT 0,
            deleted_at DATETIME,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        )
    """)
    print("   [OK] New table created")

    # 8. Re-insert data using explicit column names
    print("\n8. Re-insert data...")
    col_names = ', '.join([c[1] for c in columns])
    placeholders = ', '.join(['?' for _ in columns])
    cursor.executemany(f"INSERT INTO users ({col_names}) VALUES ({placeholders})", rows)
    print(f"   [OK] Inserted {len(rows)} rows")

    # 9. Create non-unique index
    print("\n9. Create non-unique index...")
    cursor.execute("CREATE INDEX ix_users_ehr_no ON users(ehr_no)")
    print("   [OK] Created index ix_users_ehr_no")

    conn.commit()

    # 10. Verify
    print("\n10. Verify migration result...")
    cursor.execute("PRAGMA index_list('users')")
    new_indexes = cursor.fetchall()
    print(f"    New indexes: {new_indexes}")

    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    print(f"    User records: {count}")

    conn.close()

    print("\n" + "=" * 60)
    print("Migration complete!")
    print(f"Backup file: {BACKUP_PATH}")
    print("To rollback: copy {BACKUP_PATH} to {DB_PATH}")
    print("=" * 60)


if __name__ == "__main__":
    migrate()
