"""Seed script to create initial demo users in the database"""

import asyncio
import json
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import AsyncSessionLocal, async_engine
from app.core.security import get_password_hash
from app.models.models import Base, User, Role


async def seed_database():
    """Create demo users and roles"""
    
    # Create tables if they don't exist
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as session:
        # Check if admin role exists
        from sqlalchemy import select
        result = await session.execute(
            select(Role).where(Role.name == "admin")
        )
        admin_role = result.scalar_one_or_none()
        
        if not admin_role:
            # Create roles - permissions stored as JSON string for SQLite
            admin_perms = json.dumps(["admin", "view_records", "view_map", "upload_data", "edit_records", "verify_records", "verify_matches", "run_reconciliation", "manage_users", "manage_villages", "generate_reports", "gov_sync", "sync_gov_data", "esign_docs", "view_audit"])
            officer_perms = json.dumps(["view_records", "view_map", "upload_data", "edit_records", "verify_records", "verify_matches", "run_reconciliation", "generate_reports", "gov_sync"])
            surveyor_perms = json.dumps(["view_records", "view_map", "upload_data", "edit_records"])
            viewer_perms = json.dumps(["view_records", "view_map"])
            
            roles = [
                Role(name="admin", permissions=admin_perms),
                Role(name="officer", permissions=officer_perms),
                Role(name="surveyor", permissions=surveyor_perms),
                Role(name="viewer", permissions=viewer_perms),
            ]
            for role in roles:
                session.add(role)
            await session.flush()
            
            # Get admin role
            result = await session.execute(
                select(Role).where(Role.name == "admin")
            )
            admin_role = result.scalar_one()
            print("[OK] Created roles")
        else:
            print("[SKIP] Roles already exist")
        
        # Check if admin user exists
        result = await session.execute(
            select(User).where(User.email == "admin@LandSync.gov.in")
        )
        admin_user = result.scalar_one_or_none()
        
        if not admin_user:
            # Create admin user
            admin_user = User(
                email="admin@LandSync.gov.in",
                password_hash=get_password_hash("Admin@123"),
                full_name="System Administrator",
                phone="+91-9876543210",
                role_id=admin_role.id,
                is_active=True,
                aadhaar_verified=True
            )
            session.add(admin_user)
            print("[OK] Created admin user: admin@LandSync.gov.in / Admin@123")
        else:
            print("[SKIP] Admin user already exists")
        
        await session.commit()
        print("[DONE] Database seeding complete!")


if __name__ == "__main__":
    print("[START] Seeding database with demo data...")
    asyncio.run(seed_database())
