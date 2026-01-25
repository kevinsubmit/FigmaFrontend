"""
Add appointment order numbers and backfill existing data.
"""
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy import text


def migrate():
    print("Starting appointment order number migration...")
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

            try_exec("ALTER TABLE appointments ADD COLUMN order_number VARCHAR(32)", "Add order_number column")
            try_exec("CREATE UNIQUE INDEX idx_appointments_order_number ON appointments(order_number)", "Create order_number unique index")

            rows = conn.execute(text("SELECT id, created_at FROM appointments WHERE order_number IS NULL")).fetchall()
            for row in rows:
                created_at = row[1] or datetime.utcnow()
                if isinstance(created_at, str):
                    try:
                        created_at = datetime.fromisoformat(created_at)
                    except ValueError:
                        created_at = datetime.utcnow()
                date_part = created_at.strftime("%y%m%d")
                order_number = f"ORD{date_part}{row[0]:06d}"
                conn.execute(
                    text("UPDATE appointments SET order_number = :order_number WHERE id = :id"),
                    {"order_number": order_number, "id": row[0]}
                )
            if rows:
                print(f"   ✓ Backfilled {len(rows)} appointments")

            conn.commit()
            print("\n✅ Appointment order number migration complete!")
        except Exception as exc:
            conn.rollback()
            print(f"\n❌ Migration failed: {exc}")
            raise


if __name__ == "__main__":
    migrate()
