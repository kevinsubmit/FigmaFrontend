"""repair missing core schema for fresh alembic installs

Revision ID: 20260319_000200
Revises: 20260319_000100
Create Date: 2026-03-19 00:02:00
"""

from alembic import op
import sqlalchemy as sa

from app.db.session import Base
import app.models  # noqa: F401


# revision identifiers, used by Alembic.
revision = "20260319_000200"
down_revision = "20260319_000100"
branch_labels = None
depends_on = None


def _inspector() -> sa.Inspector:
    return sa.inspect(op.get_bind())


def _has_table(table_name: str) -> bool:
    return table_name in set(_inspector().get_table_names())


def _column_names(table_name: str) -> set[str]:
    if not _has_table(table_name):
        return set()
    return {column["name"] for column in _inspector().get_columns(table_name)}


def _index_names(table_name: str) -> set[str]:
    if not _has_table(table_name):
        return set()
    return {index["name"] for index in _inspector().get_indexes(table_name)}


def _add_column_if_missing(table_name: str, column: sa.Column) -> None:
    if _has_table(table_name) and column.name not in _column_names(table_name):
        op.add_column(table_name, column)


def _create_index_if_missing(table_name: str, index_name: str, columns: list[str], *, unique: bool = False) -> None:
    if _has_table(table_name) and index_name not in _index_names(table_name):
        op.create_index(index_name, table_name, columns, unique=unique)


def upgrade() -> None:
    bind = op.get_bind()

    # Historical migrations never created a number of current production tables.
    # Create any still-missing tables using the current metadata shape.
    Base.metadata.create_all(bind=bind, checkfirst=True)

    _add_column_if_missing("backend_users", sa.Column("full_name", sa.String(length=200), nullable=True))
    _add_column_if_missing("backend_users", sa.Column("avatar_url", sa.String(length=500), nullable=True))
    _add_column_if_missing("backend_users", sa.Column("gender", sa.String(length=20), nullable=True))
    _add_column_if_missing("backend_users", sa.Column("date_of_birth", sa.Date(), nullable=True))
    _add_column_if_missing(
        "backend_users",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
    )
    _add_column_if_missing(
        "backend_users",
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("0")),
    )
    _add_column_if_missing("backend_users", sa.Column("store_id", sa.Integer(), nullable=True))
    _add_column_if_missing("backend_users", sa.Column("referral_code", sa.String(length=10), nullable=True))
    _add_column_if_missing("backend_users", sa.Column("referred_by_code", sa.String(length=10), nullable=True))

    _create_index_if_missing("backend_users", "ix_backend_users_store_id", ["store_id"])
    _create_index_if_missing("backend_users", "ix_backend_users_referral_code", ["referral_code"], unique=True)
    _create_index_if_missing("backend_users", "ix_backend_users_referred_by_code", ["referred_by_code"])

    _add_column_if_missing("appointments", sa.Column("order_number", sa.String(length=32), nullable=True))
    _add_column_if_missing("appointments", sa.Column("technician_id", sa.Integer(), nullable=True))
    _add_column_if_missing("appointments", sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True))
    _add_column_if_missing("appointments", sa.Column("cancelled_by", sa.Integer(), nullable=True))
    _add_column_if_missing("appointments", sa.Column("original_date", sa.Date(), nullable=True))
    _add_column_if_missing("appointments", sa.Column("original_time", sa.Time(), nullable=True))
    _add_column_if_missing(
        "appointments",
        sa.Column("reschedule_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )

    _create_index_if_missing("appointments", "ix_appointments_order_number", ["order_number"], unique=True)
    _create_index_if_missing("appointments", "ix_appointments_technician_id", ["technician_id"])


def downgrade() -> None:
    # Repair migration is intentionally one-way.
    pass
