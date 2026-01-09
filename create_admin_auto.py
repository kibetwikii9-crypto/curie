"""Auto-create admin user with default credentials.

This script creates an admin user without interactive input.
Default credentials:
- Email: admin@automify.com
- Password: admin123
- Role: admin
"""
import sys
from app.database import get_db_context, init_db
from app.services.auth import create_user, get_user_by_email

def main():
    email = "admin@automify.com"
    password = "admin123"
    full_name = "Admin User"

    try:
        # Initialize database (create tables)
        print("🔧 Initializing database...")
        init_db()
        print("✅ Database initialized")
        
        with get_db_context() as db:
            # Check if user already exists
            existing = get_user_by_email(db, email)
            if existing:
                print(f"✅ Admin user already exists: {email}")
                print(f"   You can login with this account")
                return

            # Create user
            user = create_user(
                db,
                email=email,
                password=password,
                full_name=full_name,
                role="admin"
            )
            print(f"✅ Admin user created successfully!")
            print(f"   Email: {user.email}")
            print(f"   Password: {password}")
            print(f"   Role: {user.role}")
            print(f"\n📝 Login credentials:")
            print(f"   Email: {email}")
            print(f"   Password: {password}")
            print(f"\n🌐 You can now login at http://localhost:3000/login")
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

