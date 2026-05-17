import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash
from app.models.category import Category
from app.api.users import DEFAULT_CATEGORIES

db = SessionLocal()
try:
    print("Hashing password...")
    h = get_password_hash("password123")
    print("Hashed successfully:", h)

    print("Creating user object...")
    u = User(email="test_scratch@example.com", full_name="Scratch Test", hashed_password=h)
    db.add(u)
    db.flush()
    print("User flushed, ID is:", u.id)

    print("Adding default categories...")
    for cat_data in DEFAULT_CATEGORIES:
        db.add(Category(user_id=u.id, **cat_data))

    print("Committing...")
    db.commit()
    print("Committed successfully!")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
