"""Add stores, services, and appointments tables

Revision ID: e2286eeaf919
Revises: 
Create Date: 2026-01-03 20:11:52.848156

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = 'e2286eeaf919'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _inspector() -> sa.Inspector:
    return sa.inspect(op.get_bind())


def _table_names() -> set[str]:
    return set(_inspector().get_table_names())


def _has_table(table_name: str) -> bool:
    return table_name in _table_names()


def _column_names(table_name: str) -> set[str]:
    if not _has_table(table_name):
        return set()
    return {column["name"] for column in _inspector().get_columns(table_name)}


def _index_names(table_name: str) -> set[str]:
    if not _has_table(table_name):
        return set()
    return {index["name"] for index in _inspector().get_indexes(table_name)}


def _has_column(table_name: str, column_name: str) -> bool:
    return column_name in _column_names(table_name)


def _create_index_if_missing(table_name: str, index_name: str, columns: list[str], *, unique: bool = False) -> None:
    if _has_table(table_name) and index_name not in _index_names(table_name):
        op.create_index(index_name, table_name, columns, unique=unique)


def _drop_index_if_exists(table_name: str, index_name: str) -> None:
    if _has_table(table_name) and index_name in _index_names(table_name):
        op.drop_index(index_name, table_name=table_name)


def _drop_table_if_exists(table_name: str) -> None:
    if _has_table(table_name):
        op.drop_table(table_name)


def _add_column_if_missing(table_name: str, column: sa.Column) -> None:
    if _has_table(table_name) and column.name not in _column_names(table_name):
        op.add_column(table_name, column)


def _drop_column_if_exists(table_name: str, column_name: str) -> None:
    if _has_table(table_name) and column_name in _column_names(table_name):
        op.drop_column(table_name, column_name)


def _create_base_stores() -> None:
    if not _has_table("store_images"):
        op.create_table(
            "store_images",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("store_id", sa.Integer(), nullable=False),
            sa.Column("image_url", sa.Text(), nullable=False),
            sa.Column("is_primary", sa.Integer(), nullable=True),
            sa.Column("display_order", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
    _create_index_if_missing("store_images", op.f("ix_store_images_id"), ["id"])
    _create_index_if_missing("store_images", op.f("ix_store_images_store_id"), ["store_id"])

    if not _has_table("stores"):
        op.create_table(
            "stores",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("address", sa.Text(), nullable=False),
            sa.Column("city", sa.String(length=100), nullable=False),
            sa.Column("state", sa.String(length=50), nullable=False),
            sa.Column("zip_code", sa.String(length=20), nullable=True),
            sa.Column("latitude", sa.Float(), nullable=True),
            sa.Column("longitude", sa.Float(), nullable=True),
            sa.Column("phone", sa.String(length=20), nullable=True),
            sa.Column("email", sa.String(length=255), nullable=True),
            sa.Column("rating", sa.Float(), nullable=True),
            sa.Column("review_count", sa.Integer(), nullable=True),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("opening_hours", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
    _create_index_if_missing("stores", op.f("ix_stores_city"), ["city"])
    _create_index_if_missing("stores", op.f("ix_stores_id"), ["id"])
    _create_index_if_missing("stores", op.f("ix_stores_name"), ["name"])

    if not _has_table("verification_codes"):
        op.create_table(
            "verification_codes",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("phone", sa.String(length=20), nullable=False),
            sa.Column("code", sa.String(length=6), nullable=False),
            sa.Column("purpose", sa.String(length=50), nullable=False),
            sa.Column("is_used", sa.Boolean(), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
    _create_index_if_missing("verification_codes", op.f("ix_verification_codes_id"), ["id"])
    _create_index_if_missing("verification_codes", op.f("ix_verification_codes_phone"), ["phone"])


def _create_base_backend_users() -> None:
    if _has_table("backend_users"):
        return

    op.create_table(
        "backend_users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("full_name", sa.String(length=200), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("gender", sa.String(length=20), nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("phone_verified", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("store_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    _create_index_if_missing("backend_users", op.f("ix_backend_users_id"), ["id"])
    _create_index_if_missing("backend_users", op.f("ix_backend_users_phone"), ["phone"], unique=True)
    _create_index_if_missing("backend_users", op.f("ix_backend_users_username"), ["username"], unique=True)
    _create_index_if_missing("backend_users", op.f("ix_backend_users_store_id"), ["store_id"])


def _create_base_services() -> None:
    if _has_table("services"):
        return

    op.create_table(
        "services",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("is_active", sa.Integer(), nullable=True, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    _create_index_if_missing("services", op.f("ix_services_category"), ["category"])
    _create_index_if_missing("services", op.f("ix_services_id"), ["id"])
    _create_index_if_missing("services", op.f("ix_services_name"), ["name"])
    _create_index_if_missing("services", op.f("ix_services_store_id"), ["store_id"])


def _create_base_appointments() -> None:
    if _has_table("appointments"):
        return

    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=False),
        sa.Column("service_id", sa.Integer(), nullable=False),
        sa.Column("technician_id", sa.Integer(), nullable=True),
        sa.Column("appointment_date", sa.Date(), nullable=False),
        sa.Column("appointment_time", sa.Time(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "confirmed", "completed", "cancelled", name="appointment_status"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("cancel_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    _create_index_if_missing("appointments", op.f("ix_appointments_appointment_date"), ["appointment_date"])
    _create_index_if_missing("appointments", op.f("ix_appointments_id"), ["id"])
    _create_index_if_missing("appointments", op.f("ix_appointments_service_id"), ["service_id"])
    _create_index_if_missing("appointments", op.f("ix_appointments_status"), ["status"])
    _create_index_if_missing("appointments", op.f("ix_appointments_store_id"), ["store_id"])
    _create_index_if_missing("appointments", op.f("ix_appointments_user_id"), ["user_id"])
    _create_index_if_missing("appointments", op.f("ix_appointments_technician_id"), ["technician_id"])


def _create_base_technicians() -> None:
    if _has_table("technicians"):
        return

    op.create_table(
        "technicians",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("specialties", sa.Text(), nullable=True),
        sa.Column("years_of_experience", sa.Integer(), nullable=True),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("is_active", sa.Integer(), nullable=True, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    _create_index_if_missing("technicians", op.f("ix_technicians_id"), ["id"])
    _create_index_if_missing("technicians", op.f("ix_technicians_name"), ["name"])
    _create_index_if_missing("technicians", op.f("ix_technicians_store_id"), ["store_id"])


def _create_base_pins_and_tags() -> None:
    if not _has_table("pins"):
        op.create_table(
            "pins",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("image_url", sa.Text(), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
    _create_index_if_missing("pins", op.f("ix_pins_id"), ["id"])

    if not _has_table("tags"):
        op.create_table(
            "tags",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
    _create_index_if_missing("tags", op.f("ix_tags_id"), ["id"])
    _create_index_if_missing("tags", op.f("ix_tags_name"), ["name"], unique=True)


def _create_base_promotions() -> None:
    if _has_table("promotions"):
        return

    op.create_table(
        "promotions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("scope", sa.Enum("PLATFORM", "STORE", name="promotionscope"), nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("discount_type", sa.Enum("FIXED_AMOUNT", "PERCENTAGE", name="promotiondiscounttype"), nullable=False),
        sa.Column("discount_value", sa.Float(), nullable=False),
        sa.Column("rules", sa.String(length=500), nullable=True),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    _create_index_if_missing("promotions", op.f("ix_promotions_id"), ["id"])
    _create_index_if_missing("promotions", op.f("ix_promotions_scope"), ["scope"])
    _create_index_if_missing("promotions", op.f("ix_promotions_store_id"), ["store_id"])
    _create_index_if_missing("promotions", op.f("ix_promotions_type"), ["type"])
    _create_index_if_missing("promotions", op.f("ix_promotions_start_at"), ["start_at"])
    _create_index_if_missing("promotions", op.f("ix_promotions_end_at"), ["end_at"])
    _create_index_if_missing("promotions", op.f("ix_promotions_is_active"), ["is_active"])


def _create_base_coupons() -> None:
    if not _has_table("coupons"):
        op.create_table(
            "coupons",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("type", sa.Enum("FIXED_AMOUNT", "PERCENTAGE", name="coupontype"), nullable=False),
            sa.Column("category", sa.Enum("NORMAL", "NEWCOMER", "BIRTHDAY", "REFERRAL", "ACTIVITY", name="couponcategory"), nullable=False),
            sa.Column("discount_value", sa.Float(), nullable=False),
            sa.Column("min_amount", sa.Float(), nullable=True),
            sa.Column("max_discount", sa.Float(), nullable=True),
            sa.Column("valid_days", sa.Integer(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("total_quantity", sa.Integer(), nullable=True),
            sa.Column("claimed_quantity", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("points_required", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
    _create_index_if_missing("coupons", op.f("ix_coupons_id"), ["id"])

    if not _has_table("user_coupons"):
        op.create_table(
            "user_coupons",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("coupon_id", sa.Integer(), nullable=False),
            sa.Column("status", sa.Enum("AVAILABLE", "USED", "EXPIRED", name="couponstatus"), nullable=False),
            sa.Column("source", sa.String(length=50), nullable=True),
            sa.Column("obtained_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("appointment_id", sa.Integer(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
    _create_index_if_missing("user_coupons", op.f("ix_user_coupons_id"), ["id"])
    _create_index_if_missing("user_coupons", op.f("ix_user_coupons_user_id"), ["user_id"])
    _create_index_if_missing("user_coupons", op.f("ix_user_coupons_coupon_id"), ["coupon_id"])
    _create_index_if_missing("user_coupons", op.f("ix_user_coupons_status"), ["status"])
    _create_index_if_missing("user_coupons", op.f("ix_user_coupons_expires_at"), ["expires_at"])


def upgrade() -> None:
    _create_base_stores()

    # Legacy Drizzle bootstrap tables. Only drop when the legacy table is actually present.
    _drop_table_if_exists("salons")
    _drop_table_if_exists("stylists")
    _drop_index_if_exists("__drizzle_migrations", "id")
    _drop_table_if_exists("__drizzle_migrations")
    if _has_table("users") and "openId" in _column_names("users"):
        _drop_index_if_exists("users", "users_openId_unique")
        _drop_table_if_exists("users")
    if _has_table("reviews") and "userId" in _column_names("reviews"):
        _drop_table_if_exists("reviews")
    if _has_table("favorites") and "userId" in _column_names("favorites"):
        _drop_table_if_exists("favorites")

    if not _has_table("appointments"):
        _create_base_appointments()
    else:
        _add_column_if_missing("appointments", sa.Column("user_id", sa.Integer(), nullable=False))
        _add_column_if_missing("appointments", sa.Column("store_id", sa.Integer(), nullable=False))
        _add_column_if_missing("appointments", sa.Column("service_id", sa.Integer(), nullable=False))
        _add_column_if_missing("appointments", sa.Column("technician_id", sa.Integer(), nullable=True))
        _add_column_if_missing("appointments", sa.Column("appointment_date", sa.Date(), nullable=False))
        _add_column_if_missing("appointments", sa.Column("appointment_time", sa.Time(), nullable=False))
        _add_column_if_missing(
            "appointments",
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        )
        _add_column_if_missing("appointments", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))
        _add_column_if_missing(
            "appointments",
            sa.Column(
                "status",
                sa.Enum("pending", "confirmed", "completed", "cancelled", name="appointment_status"),
                nullable=False,
                server_default="pending",
            ),
        )
        _add_column_if_missing("appointments", sa.Column("notes", sa.Text(), nullable=True))
        _add_column_if_missing("appointments", sa.Column("cancel_reason", sa.Text(), nullable=True))
        _create_index_if_missing("appointments", op.f("ix_appointments_appointment_date"), ["appointment_date"])
        _create_index_if_missing("appointments", op.f("ix_appointments_id"), ["id"])
        _create_index_if_missing("appointments", op.f("ix_appointments_service_id"), ["service_id"])
        _create_index_if_missing("appointments", op.f("ix_appointments_status"), ["status"])
        _create_index_if_missing("appointments", op.f("ix_appointments_store_id"), ["store_id"])
        _create_index_if_missing("appointments", op.f("ix_appointments_user_id"), ["user_id"])
        _create_index_if_missing("appointments", op.f("ix_appointments_technician_id"), ["technician_id"])
        for legacy_column in [
            "createdAt",
            "cancellationReason",
            "appointmentDate",
            "userId",
            "serviceId",
            "stylistId",
            "updatedAt",
            "salonId",
        ]:
            _drop_column_if_exists("appointments", legacy_column)

    if not _has_table("backend_users"):
        _create_base_backend_users()
    else:
        _add_column_if_missing(
            "backend_users",
            sa.Column("phone_verified", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        )
        if _has_column("backend_users", "phone"):
            op.alter_column(
                "backend_users",
                "phone",
                existing_type=mysql.VARCHAR(length=20),
                nullable=False,
            )
        if _has_column("backend_users", "email"):
            op.alter_column(
                "backend_users",
                "email",
                existing_type=mysql.VARCHAR(length=255),
                nullable=True,
            )
        _drop_index_if_exists("backend_users", "ix_backend_users_email")
        _create_index_if_missing("backend_users", op.f("ix_backend_users_phone"), ["phone"], unique=True)
        _create_index_if_missing("backend_users", op.f("ix_backend_users_id"), ["id"])
        if _has_column("backend_users", "username"):
            _create_index_if_missing("backend_users", op.f("ix_backend_users_username"), ["username"], unique=True)
        if _has_column("backend_users", "store_id"):
            _create_index_if_missing("backend_users", op.f("ix_backend_users_store_id"), ["store_id"])

    if not _has_table("services"):
        _create_base_services()
    else:
        _add_column_if_missing("services", sa.Column("store_id", sa.Integer(), nullable=False))
        _add_column_if_missing("services", sa.Column("duration_minutes", sa.Integer(), nullable=False))
        _add_column_if_missing("services", sa.Column("is_active", sa.Integer(), nullable=True))
        _add_column_if_missing(
            "services",
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        )
        _add_column_if_missing("services", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))
        if _has_column("services", "price"):
            op.alter_column(
                "services",
                "price",
                existing_type=mysql.DECIMAL(precision=10, scale=2),
                type_=sa.Float(),
                existing_nullable=False,
            )
        if _has_column("services", "category"):
            op.alter_column(
                "services",
                "category",
                existing_type=mysql.VARCHAR(length=100),
                nullable=True,
            )
        _create_index_if_missing("services", op.f("ix_services_category"), ["category"])
        _create_index_if_missing("services", op.f("ix_services_id"), ["id"])
        _create_index_if_missing("services", op.f("ix_services_name"), ["name"])
        _create_index_if_missing("services", op.f("ix_services_store_id"), ["store_id"])
        for legacy_column in ["createdAt", "image", "isActive", "duration", "updatedAt", "salonId"]:
            _drop_column_if_exists("services", legacy_column)

    _create_base_technicians()
    _create_base_pins_and_tags()
    _create_base_promotions()
    _create_base_coupons()


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('services', sa.Column('salonId', mysql.INTEGER(display_width=11), autoincrement=False, nullable=False))
    op.add_column('services', sa.Column('updatedAt', mysql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'), nullable=False))
    op.add_column('services', sa.Column('duration', mysql.INTEGER(display_width=11), autoincrement=False, nullable=False))
    op.add_column('services', sa.Column('isActive', mysql.TINYINT(display_width=1), server_default=sa.text("'1'"), autoincrement=False, nullable=True))
    op.add_column('services', sa.Column('image', mysql.TEXT(), nullable=True))
    op.add_column('services', sa.Column('createdAt', mysql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False))
    op.drop_index(op.f('ix_services_store_id'), table_name='services')
    op.drop_index(op.f('ix_services_name'), table_name='services')
    op.drop_index(op.f('ix_services_id'), table_name='services')
    op.drop_index(op.f('ix_services_category'), table_name='services')
    op.alter_column('services', 'category',
               existing_type=mysql.VARCHAR(length=100),
               nullable=False)
    op.alter_column('services', 'price',
               existing_type=sa.Float(),
               type_=mysql.DECIMAL(precision=10, scale=2),
               existing_nullable=False)
    op.drop_column('services', 'updated_at')
    op.drop_column('services', 'created_at')
    op.drop_column('services', 'is_active')
    op.drop_column('services', 'duration_minutes')
    op.drop_column('services', 'store_id')
    op.drop_index(op.f('ix_backend_users_phone'), table_name='backend_users')
    op.create_index('ix_backend_users_email', 'backend_users', ['email'], unique=True)
    op.alter_column('backend_users', 'email',
               existing_type=mysql.VARCHAR(length=255),
               nullable=False)
    op.alter_column('backend_users', 'phone',
               existing_type=mysql.VARCHAR(length=20),
               nullable=True)
    op.drop_column('backend_users', 'phone_verified')
    op.add_column('appointments', sa.Column('salonId', mysql.INTEGER(display_width=11), autoincrement=False, nullable=False))
    op.add_column('appointments', sa.Column('updatedAt', mysql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'), nullable=False))
    op.add_column('appointments', sa.Column('stylistId', mysql.INTEGER(display_width=11), autoincrement=False, nullable=False))
    op.add_column('appointments', sa.Column('serviceId', mysql.INTEGER(display_width=11), autoincrement=False, nullable=False))
    op.add_column('appointments', sa.Column('userId', mysql.INTEGER(display_width=11), autoincrement=False, nullable=False))
    op.add_column('appointments', sa.Column('appointmentDate', mysql.TIMESTAMP(), nullable=False))
    op.add_column('appointments', sa.Column('cancellationReason', mysql.TEXT(), nullable=True))
    op.add_column('appointments', sa.Column('createdAt', mysql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False))
    op.drop_index(op.f('ix_appointments_user_id'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_store_id'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_status'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_service_id'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_id'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_appointment_date'), table_name='appointments')
    op.drop_column('appointments', 'updated_at')
    op.drop_column('appointments', 'created_at')
    op.drop_column('appointments', 'appointment_time')
    op.drop_column('appointments', 'appointment_date')
    op.drop_column('appointments', 'service_id')
    op.drop_column('appointments', 'store_id')
    op.drop_column('appointments', 'user_id')
    op.create_table('favorites',
    sa.Column('id', mysql.INTEGER(display_width=11), autoincrement=True, nullable=False),
    sa.Column('userId', mysql.INTEGER(display_width=11), autoincrement=False, nullable=False),
    sa.Column('salonId', mysql.INTEGER(display_width=11), autoincrement=False, nullable=False),
    sa.Column('createdAt', mysql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    mysql_collate='utf8mb4_bin',
    mysql_default_charset='utf8mb4',
    mysql_engine='InnoDB'
    )
    op.create_table('reviews',
    sa.Column('id', mysql.INTEGER(display_width=11), autoincrement=True, nullable=False),
    sa.Column('userId', mysql.INTEGER(display_width=11), autoincrement=False, nullable=False),
    sa.Column('salonId', mysql.INTEGER(display_width=11), autoincrement=False, nullable=False),
    sa.Column('stylistId', mysql.INTEGER(display_width=11), autoincrement=False, nullable=True),
    sa.Column('appointmentId', mysql.INTEGER(display_width=11), autoincrement=False, nullable=True),
    sa.Column('rating', mysql.INTEGER(display_width=11), autoincrement=False, nullable=False),
    sa.Column('comment', mysql.TEXT(), nullable=True),
    sa.Column('images', mysql.JSON(), nullable=True),
    sa.Column('createdAt', mysql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.Column('updatedAt', mysql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    mysql_collate='utf8mb4_bin',
    mysql_default_charset='utf8mb4',
    mysql_engine='InnoDB'
    )
    op.create_table('users',
    sa.Column('id', mysql.INTEGER(display_width=11), autoincrement=True, nullable=False),
    sa.Column('openId', mysql.VARCHAR(length=64), nullable=False),
    sa.Column('name', mysql.TEXT(), nullable=True),
    sa.Column('email', mysql.VARCHAR(length=320), nullable=True),
    sa.Column('phone', mysql.VARCHAR(length=20), nullable=True),
    sa.Column('loginMethod', mysql.VARCHAR(length=64), nullable=True),
    sa.Column('role', mysql.ENUM('user', 'admin'), server_default=sa.text("'user'"), nullable=False),
    sa.Column('createdAt', mysql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.Column('updatedAt', mysql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'), nullable=False),
    sa.Column('lastSignedIn', mysql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    mysql_collate='utf8mb4_bin',
    mysql_default_charset='utf8mb4',
    mysql_engine='InnoDB'
    )
    op.create_index('users_openId_unique', 'users', ['openId'], unique=True)
    op.create_table('__drizzle_migrations',
    sa.Column('id', mysql.BIGINT(display_width=20, unsigned=True), autoincrement=True, nullable=False),
    sa.Column('hash', mysql.TEXT(), nullable=False),
    sa.Column('created_at', mysql.BIGINT(display_width=20), autoincrement=False, nullable=True),
    sa.PrimaryKeyConstraint('id'),
    mysql_collate='utf8mb4_bin',
    mysql_default_charset='utf8mb4',
    mysql_engine='InnoDB'
    )
    op.create_index('id', '__drizzle_migrations', ['id'], unique=True)
    op.create_table('stylists',
    sa.Column('id', mysql.INTEGER(display_width=11), autoincrement=True, nullable=False),
    sa.Column('salonId', mysql.INTEGER(display_width=11), autoincrement=False, nullable=False),
    sa.Column('name', mysql.VARCHAR(length=255), nullable=False),
    sa.Column('avatar', mysql.TEXT(), nullable=True),
    sa.Column('bio', mysql.TEXT(), nullable=True),
    sa.Column('specialties', mysql.JSON(), nullable=True),
    sa.Column('rating', mysql.DECIMAL(precision=3, scale=2), server_default=sa.text("'0'"), nullable=True),
    sa.Column('reviewCount', mysql.INTEGER(display_width=11), server_default=sa.text("'0'"), autoincrement=False, nullable=True),
    sa.Column('portfolio', mysql.JSON(), nullable=True),
    sa.Column('yearsOfExperience', mysql.INTEGER(display_width=11), autoincrement=False, nullable=True),
    sa.Column('isActive', mysql.TINYINT(display_width=1), server_default=sa.text("'1'"), autoincrement=False, nullable=True),
    sa.Column('createdAt', mysql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.Column('updatedAt', mysql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    mysql_collate='utf8mb4_bin',
    mysql_default_charset='utf8mb4',
    mysql_engine='InnoDB'
    )
    op.create_table('salons',
    sa.Column('id', mysql.INTEGER(display_width=11), autoincrement=True, nullable=False),
    sa.Column('name', mysql.VARCHAR(length=255), nullable=False),
    sa.Column('description', mysql.TEXT(), nullable=True),
    sa.Column('address', mysql.TEXT(), nullable=False),
    sa.Column('city', mysql.VARCHAR(length=100), nullable=True),
    sa.Column('state', mysql.VARCHAR(length=50), nullable=True),
    sa.Column('zipCode', mysql.VARCHAR(length=20), nullable=True),
    sa.Column('latitude', mysql.DECIMAL(precision=10, scale=7), nullable=True),
    sa.Column('longitude', mysql.DECIMAL(precision=10, scale=7), nullable=True),
    sa.Column('phone', mysql.VARCHAR(length=20), nullable=True),
    sa.Column('email', mysql.VARCHAR(length=320), nullable=True),
    sa.Column('rating', mysql.DECIMAL(precision=3, scale=2), server_default=sa.text("'0'"), nullable=True),
    sa.Column('reviewCount', mysql.INTEGER(display_width=11), server_default=sa.text("'0'"), autoincrement=False, nullable=True),
    sa.Column('images', mysql.JSON(), nullable=True),
    sa.Column('coverImage', mysql.TEXT(), nullable=True),
    sa.Column('businessHours', mysql.JSON(), nullable=True),
    sa.Column('amenities', mysql.JSON(), nullable=True),
    sa.Column('isActive', mysql.TINYINT(display_width=1), server_default=sa.text("'1'"), autoincrement=False, nullable=True),
    sa.Column('createdAt', mysql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.Column('updatedAt', mysql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    mysql_collate='utf8mb4_bin',
    mysql_default_charset='utf8mb4',
    mysql_engine='InnoDB'
    )
    op.drop_index(op.f('ix_verification_codes_phone'), table_name='verification_codes')
    op.drop_index(op.f('ix_verification_codes_id'), table_name='verification_codes')
    op.drop_table('verification_codes')
    op.drop_index(op.f('ix_stores_name'), table_name='stores')
    op.drop_index(op.f('ix_stores_id'), table_name='stores')
    op.drop_index(op.f('ix_stores_city'), table_name='stores')
    op.drop_table('stores')
    op.drop_index(op.f('ix_store_images_store_id'), table_name='store_images')
    op.drop_index(op.f('ix_store_images_id'), table_name='store_images')
    op.drop_table('store_images')
    # ### end Alembic commands ###
