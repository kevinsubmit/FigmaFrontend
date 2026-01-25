"""
Add gift card transfer fields and transactions table
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy import text


def migrate():
    """Execute gift card transfer migration"""
    print("Starting gift card transfer migration...")
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

            try_exec("ALTER TABLE gift_cards ADD COLUMN purchaser_id INTEGER", "Add purchaser_id")
            try_exec("ALTER TABLE gift_cards ADD COLUMN claim_code VARCHAR(16)", "Add claim_code")
            try_exec("ALTER TABLE gift_cards ADD COLUMN recipient_phone VARCHAR(20)", "Add recipient_phone")
            try_exec("ALTER TABLE gift_cards ADD COLUMN recipient_message VARCHAR(255)", "Add recipient_message")
            try_exec("ALTER TABLE gift_cards ADD COLUMN claim_expires_at TIMESTAMP", "Add claim_expires_at")
            try_exec("ALTER TABLE gift_cards ADD COLUMN claimed_by_user_id INTEGER", "Add claimed_by_user_id")
            try_exec("ALTER TABLE gift_cards ADD COLUMN claimed_at TIMESTAMP", "Add claimed_at")

            try_exec("CREATE INDEX idx_gift_cards_purchaser_id ON gift_cards(purchaser_id)", "Create purchaser_id index")
            try_exec("CREATE INDEX idx_gift_cards_recipient_phone ON gift_cards(recipient_phone)", "Create recipient_phone index")
            try_exec("CREATE UNIQUE INDEX idx_gift_cards_claim_code ON gift_cards(claim_code)", "Create claim_code unique index")

            try:
                conn.execute(text("UPDATE gift_cards SET purchaser_id = user_id WHERE purchaser_id IS NULL"))
                print("   ✓ Backfilled purchaser_id")
            except Exception as exc:
                print(f"   ✗ Backfill purchaser_id failed: {exc}")

            try_exec("""
                CREATE TABLE IF NOT EXISTS gift_card_transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    gift_card_id INTEGER NOT NULL,
                    user_id INTEGER,
                    transaction_type VARCHAR(30) NOT NULL,
                    amount FLOAT NOT NULL DEFAULT 0,
                    balance_before FLOAT NOT NULL DEFAULT 0,
                    balance_after FLOAT NOT NULL DEFAULT 0,
                    note VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """, "Create gift_card_transactions table")

            try_exec("CREATE INDEX idx_gift_card_transactions_card_id ON gift_card_transactions(gift_card_id)", "Create transaction gift_card_id index")
            try_exec("CREATE INDEX idx_gift_card_transactions_user_id ON gift_card_transactions(user_id)", "Create transaction user_id index")

            conn.commit()
            print("\n✅ Gift card transfer migration complete!")
        except Exception as exc:
            conn.rollback()
            print(f"\n❌ Migration failed: {exc}")
            raise


if __name__ == "__main__":
    migrate()
