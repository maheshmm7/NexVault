import sqlite3
import os

db_path = r"f:\Vaultify\backend\vaultify.db"

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check if column exists
cursor.execute("PRAGMA table_info(users)")
columns = cursor.fetchall()
has_column = any(col[1] == 'full_name' for col in columns)

if not has_column:
    print("Adding full_name column to users table...")
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN full_name VARCHAR")
        conn.commit()
        print("Column added successfully!")
    except Exception as e:
        print(f"Failed to add column: {e}")
else:
    print("full_name column already exists in users table.")

conn.close()
