import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app.database import SessionLocal
from backend.app.models.models import User, UserRole
from backend.app.utils.auth import hash_password
import uuid

def create_test_users():
    db = SessionLocal()
    try:
        roles_to_create = [
            ("Sales Exec", "sales@test.com", UserRole.SALES_EXECUTIVE),
            ("Procurement Head", "procurement@test.com", UserRole.PROCUREMENT_HEAD),
            ("Warehouse Mgr", "warehouse@test.com", UserRole.WAREHOUSE_MANAGER),
            ("Accountant", "accountant@test.com", UserRole.ACCOUNTANT),
        ]

        for first_name, email, role in roles_to_create:
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                print(f"User {email} already exists. Updating role to {role}")
                existing.role = role
            else:
                print(f"Creating user {email} with role {role}")
                user = User(
                    id=str(uuid.uuid4()),
                    email=email,
                    password_hash=hash_password("password123"),
                    first_name=first_name,
                    last_name="Test",
                    role=role,
                    is_active=True
                )
                db.add(user)
        
        db.commit()
        print("Success: Test users created/updated.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_test_users()
