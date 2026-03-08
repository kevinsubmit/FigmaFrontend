"""
Create app_version_policies table and seed default platform rows.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import Base, SessionLocal, engine
from app.models.app_version_policy import AppVersionPolicy


def migrate():
    print("Starting app version policy migration...")
    Base.metadata.create_all(bind=engine, tables=[AppVersionPolicy.__table__])

    db = SessionLocal()
    try:
        for platform in ("ios", "android", "h5"):
            existing = (
                db.query(AppVersionPolicy)
                .filter(AppVersionPolicy.platform == platform)
                .first()
            )
            if existing:
                print(f"   - policy row exists: {platform}")
                continue
            db.add(
                AppVersionPolicy(
                    platform=platform,
                    latest_version="",
                    min_supported_version="",
                    is_enabled=True,
                )
            )
            print(f"   ✓ seed policy row: {platform}")
        db.commit()
        print("\n✅ App version policy migration complete!")
    except Exception as exc:
        db.rollback()
        print(f"\n❌ Migration failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
