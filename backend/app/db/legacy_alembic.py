"""
Helpers for adopting legacy databases into Alembic management.

This is for databases that were originally created via ``Base.metadata.create_all``
or manual scripts and therefore have application tables but no ``alembic_version``.
The reconciler only applies non-destructive additions:

- create missing tables from current metadata
- add missing columns
- add missing indexes

After the schema is reconciled, callers may stamp the database to the current
Alembic head so future upgrades can proceed normally.
"""
from __future__ import annotations

from collections import Counter
from pathlib import Path
from typing import Iterable, Iterator

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.operations import Operations
from alembic.script import ScriptDirectory
from sqlalchemy import inspect
from sqlalchemy.engine import Connection
from sqlalchemy.schema import Column, Index, Table

from app.db.session import Base
import app.models  # noqa: F401


LEGACY_APP_TABLE_MARKERS = {
    "appointments",
    "backend_users",
    "notifications",
    "pins",
    "services",
    "store_hours",
    "stores",
    "technicians",
}

ADDITIVE_DIFF_TYPES = {
    "add_table",
    "add_column",
    "add_index",
}


def _flatten_diffs(diffs: Iterable[object]) -> Iterator[tuple]:
    for diff in diffs:
        if isinstance(diff, list):
            yield from _flatten_diffs(diff)
        elif isinstance(diff, tuple) and diff and isinstance(diff[0], str):
            yield diff


def _clone_column(column: Column) -> Column:
    # Alembic operations expect a detached column object.
    return column.copy()  # type: ignore[return-value]


def collect_schema_diffs(connection: Connection) -> list[tuple]:
    context = MigrationContext.configure(connection)
    return list(_flatten_diffs(compare_metadata(context, Base.metadata)))


def summarize_diffs(diffs: Iterable[tuple]) -> dict[str, int]:
    counter = Counter()
    for diff in diffs:
        counter[diff[0]] += 1
    return dict(counter)


def has_alembic_version_table(connection: Connection) -> bool:
    return "alembic_version" in set(inspect(connection).get_table_names())


def get_current_revision(connection: Connection) -> str | None:
    context = MigrationContext.configure(connection)
    return context.get_current_revision()


def is_legacy_unmanaged_database(connection: Connection) -> bool:
    table_names = set(inspect(connection).get_table_names())
    return "alembic_version" not in table_names and bool(table_names & LEGACY_APP_TABLE_MARKERS)


def apply_additive_diffs(connection: Connection, diffs: Iterable[tuple], *, dry_run: bool = False) -> list[str]:
    context = MigrationContext.configure(connection)
    operations = Operations(context)
    applied: list[str] = []

    for diff in diffs:
        kind = diff[0]
        if kind not in ADDITIVE_DIFF_TYPES:
            continue

        if kind == "add_table":
            table: Table = diff[1]
            applied.append(f"create_table:{table.name}")
            if not dry_run:
                table.create(bind=connection, checkfirst=True)
            continue

        if kind == "add_column":
            schema, table_name, column = diff[1], diff[2], diff[3]
            applied.append(f"add_column:{table_name}.{column.name}")
            if not dry_run:
                operations.add_column(table_name, _clone_column(column), schema=schema)
            continue

        if kind == "add_index":
            index: Index = diff[1]
            applied.append(f"add_index:{index.name}")
            if not dry_run:
                index.create(bind=connection, checkfirst=True)
            continue

    return applied


def build_alembic_config() -> Config:
    backend_root = Path(__file__).resolve().parents[2]
    config = Config(str(backend_root / "alembic.ini"))
    config.set_main_option("script_location", str(backend_root / "alembic"))
    config.set_main_option("prepend_sys_path", str(backend_root))
    return config


def get_head_revision() -> str:
    return ScriptDirectory.from_config(build_alembic_config()).get_current_head()


def stamp_head() -> None:
    command.stamp(build_alembic_config(), "head")
