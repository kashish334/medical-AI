"""
scripts/seed_db.py
------------------
Run once to:
  1. Create all database tables
  2. Create the admin user (credentials from .env)

Usage:
    python scripts/seed_db.py
"""

import os
import sys

# Make sure the project root is on the path
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from dotenv import load_dotenv
load_dotenv()

from backend.db.database import engine, Base, SessionLocal
from backend.db import db_models   # noqa: registers all ORM models
from backend.db.crud import get_user_by_username, create_user

def main():
    print("Creating database tables…")
    Base.metadata.create_all(bind=engine)
    print("  ✅ Tables created")

    db = SessionLocal()
    try:
        admin_username = os.getenv("ADMIN_USERNAME", "admin")
        admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
        admin_email    = f"{admin_username}@medbot.local"

        if get_user_by_username(db, admin_username):
            print(f"  ℹ️  Admin user '{admin_username}' already exists — skipping")
        else:
            create_user(db, admin_username, admin_email, admin_password, is_admin=True)
            print(f"  ✅ Admin user '{admin_username}' created")
    finally:
        db.close()

    print("\nDatabase ready. You can now start the backend:\n")
    print("  uvicorn backend.main:app --reload --port 8000\n")


if __name__ == "__main__":
    main()
