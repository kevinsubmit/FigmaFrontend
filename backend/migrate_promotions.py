"""
Create promotions tables
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy import text


def migrate():
    print("Starting promotions migration...")
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
                CREATE TABLE IF NOT EXISTS promotions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scope TEXT NOT NULL,
                    store_id INTEGER,
                    title TEXT NOT NULL,
                    type TEXT NOT NULL,
                    discount_type TEXT NOT NULL,
                    discount_value REAL NOT NULL,
                    rules TEXT,
                    start_at TIMESTAMP NOT NULL,
                    end_at TIMESTAMP NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """,
                "Create promotions table"
            )

            try_exec(
                """
                CREATE TABLE IF NOT EXISTS promotion_services (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    promotion_id INTEGER NOT NULL,
                    service_id INTEGER NOT NULL,
                    min_price REAL,
                    max_price REAL,
                    FOREIGN KEY(promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
                    FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE CASCADE
                )
                """,
                "Create promotion_services table"
            )

            try_exec("CREATE INDEX idx_promotions_scope ON promotions(scope)", "Create scope index")
            try_exec("CREATE INDEX idx_promotions_store_id ON promotions(store_id)", "Create store_id index")
            try_exec("CREATE INDEX idx_promotions_type ON promotions(type)", "Create type index")
            try_exec("CREATE INDEX idx_promotions_active ON promotions(is_active)", "Create is_active index")
            try_exec("CREATE INDEX idx_promotions_start_at ON promotions(start_at)", "Create start_at index")
            try_exec("CREATE INDEX idx_promotions_end_at ON promotions(end_at)", "Create end_at index")
            try_exec("CREATE INDEX idx_promotion_services_promotion_id ON promotion_services(promotion_id)", "Create promotion_id index")
            try_exec("CREATE INDEX idx_promotion_services_service_id ON promotion_services(service_id)", "Create service_id index")

            conn.commit()
            print("\n✅ Promotions migration complete!")
        except Exception as exc:
            conn.rollback()
            print(f"\n❌ Migration failed: {exc}")
            raise


if __name__ == "__main__":
    migrate()
