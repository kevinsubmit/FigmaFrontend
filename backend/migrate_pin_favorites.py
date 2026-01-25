"""
Create pin favorites table
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy import text


def migrate():
    print("Starting pin favorites migration...")
    with engine.connect() as conn:
        try:
            def try_exec(statement: str, label: str):
                try:
                    conn.execute(text(statement))
                    print(f"   ✓ {label}")
                except Exception as exc:
                    if "already exists" in str(exc).lower():
                        print(f"   - {label} (already exists)")
                    else:
                        print(f"   ✗ {label} failed: {exc}")

            try_exec(
                """
                CREATE TABLE IF NOT EXISTS pin_favorites (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    pin_id INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, pin_id)
                )
                """,
                "Create pin_favorites table"
            )

            try_exec("CREATE INDEX idx_pin_favorites_user_id ON pin_favorites(user_id)", "Create user_id index")
            try_exec("CREATE INDEX idx_pin_favorites_pin_id ON pin_favorites(pin_id)", "Create pin_id index")

            conn.commit()
            print("\n✅ Pin favorites migration complete!")
        except Exception as exc:
            conn.rollback()
            print(f"\n❌ Migration failed: {exc}")
            raise


if __name__ == "__main__":
    migrate()
