"""add support contact settings table

Revision ID: 20260405_000200
Revises: 20260405_000100
Create Date: 2026-04-05 00:02:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260405_000200"
down_revision = "20260405_000100"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "support_contact_settings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("singleton_key", sa.String(length=32), nullable=False),
        sa.Column("feedback_whatsapp_url", sa.String(length=500), nullable=False),
        sa.Column("feedback_imessage_url", sa.String(length=500), nullable=False),
        sa.Column("feedback_instagram_url", sa.String(length=500), nullable=False),
        sa.Column("partnership_whatsapp_url", sa.String(length=500), nullable=False),
        sa.Column("partnership_imessage_url", sa.String(length=500), nullable=False),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("singleton_key", name="uq_support_contact_settings_singleton_key"),
    )
    op.create_index("ix_support_contact_settings_id", "support_contact_settings", ["id"], unique=False)
    op.create_index("ix_support_contact_settings_singleton_key", "support_contact_settings", ["singleton_key"], unique=False)

    support_contact_settings = sa.table(
        "support_contact_settings",
        sa.column("singleton_key", sa.String(length=32)),
        sa.column("feedback_whatsapp_url", sa.String(length=500)),
        sa.column("feedback_imessage_url", sa.String(length=500)),
        sa.column("feedback_instagram_url", sa.String(length=500)),
        sa.column("partnership_whatsapp_url", sa.String(length=500)),
        sa.column("partnership_imessage_url", sa.String(length=500)),
    )
    op.bulk_insert(
        support_contact_settings,
        [{
            "singleton_key": "default",
            "feedback_whatsapp_url": "https://wa.me/14151234567",
            "feedback_imessage_url": "sms:+14151234567",
            "feedback_instagram_url": "https://instagram.com",
            "partnership_whatsapp_url": "https://wa.me/14151234567",
            "partnership_imessage_url": "sms:+14151234567",
        }],
    )


def downgrade() -> None:
    op.drop_index("ix_support_contact_settings_singleton_key", table_name="support_contact_settings")
    op.drop_index("ix_support_contact_settings_id", table_name="support_contact_settings")
    op.drop_table("support_contact_settings")
