"""
Add transfer_expiry_notified to gift cards
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy import text


def migrate():
    """Execute gift card expiry notification migration"""
    print("Starting gift card expiry notification migration...")
    with engine.connect() as conn:
        try:
            def try_exec(statement: str, label: str):
                try:
                    conn.execute(text(statement))
                    print(f"   ✓ {label}")
                except Exception as exc:
                    if "already exists" in str(exc).lower() or "duplicate column" in str(exc).lower():
                        print(f"   - {label} (already exists)")
                    else:
                        print(f"   ✗ {label} failed: {exc}")

            try_exec(
                "ALTER TABLE gift_cards ADD COLUMN transfer_expiry_notified BOOLEAN DEFAULT 0",
                "Add transfer_expiry_notified"
            )

            conn.commit()
            print("\n✅ Gift card expiry notification migration complete!")
        except Exception as exc:
            conn.rollback()
            print(f"\n❌ Migration failed: {exc}")
            raise


if __name__ == "__main__":
    migrate()
