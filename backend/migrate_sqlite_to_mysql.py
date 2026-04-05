#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import MetaData, Table, create_engine, inspect, select, text

from app.core.config import settings

EXCLUDED_TABLES = {"alembic_version"}
BATCH_SIZE = 500


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate legacy SQLite data into the current MySQL database.")
    parser.add_argument(
        "--source-sqlite",
        default="/app/nailsdash.db",
        help="Absolute path to the source SQLite database file inside the backend container.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only print the migration plan and source counts without mutating MySQL.",
    )
    return parser.parse_args()


def source_engine_for(path: Path):
    return create_engine(f"sqlite:///{path}")


def target_engine():
    return create_engine(settings.DATABASE_URL)


def source_tables(engine) -> list[str]:
    return sorted(
        name
        for name in inspect(engine).get_table_names()
        if name not in EXCLUDED_TABLES
    )


def target_tables(engine) -> list[str]:
    return sorted(
        name
        for name in inspect(engine).get_table_names()
        if name not in EXCLUDED_TABLES
    )


def parse_datetime_string(value: str) -> datetime | date | str:
    value = value.strip()
    if not value:
        return value
    candidate = value
    if candidate.endswith("Z"):
        candidate = candidate[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(candidate)
    except ValueError:
        return value
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def normalize_value(value: Any, column) -> Any:
    if value is None:
        return None

    type_name = column.type.__class__.__name__.lower()

    if "json" in type_name and isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value

    if "boolean" in type_name or type_name == "bool":
        if isinstance(value, (int, bool)):
            return bool(value)

    if "datetime" in type_name or "timestamp" in type_name:
        if isinstance(value, str):
            parsed = parse_datetime_string(value)
            return parsed if isinstance(parsed, datetime) else value

    if type_name == "date":
        if isinstance(value, str):
            parsed = parse_datetime_string(value)
            if isinstance(parsed, datetime):
                return parsed.date()
            if isinstance(parsed, date):
                return parsed

    return value


def chunked(items: list[dict[str, Any]], size: int):
    for start in range(0, len(items), size):
        yield items[start : start + size]


def clear_target_tables(conn, tables: list[str]) -> None:
    conn.exec_driver_sql("SET FOREIGN_KEY_CHECKS = 0")
    try:
        for table_name in tables:
            conn.exec_driver_sql(f"DELETE FROM `{table_name}`")
    finally:
        conn.exec_driver_sql("SET FOREIGN_KEY_CHECKS = 1")


def reset_auto_increment(conn, table: Table) -> None:
    if "id" not in table.c:
        return
    max_id = conn.execute(select(text("MAX(id)")).select_from(table)).scalar()
    next_id = (int(max_id) + 1) if max_id is not None else 1
    conn.exec_driver_sql(f"ALTER TABLE `{table.name}` AUTO_INCREMENT = {next_id}")


def main() -> int:
    args = parse_args()
    source_path = Path(args.source_sqlite)
    if not source_path.exists():
        raise SystemExit(f"Source SQLite database not found: {source_path}")

    src_engine = source_engine_for(source_path)
    dst_engine = target_engine()

    src_tables = source_tables(src_engine)
    dst_tables = target_tables(dst_engine)
    common_tables = [name for name in src_tables if name in dst_tables]
    target_only_tables = [name for name in dst_tables if name not in src_tables]

    print(f"SOURCE={source_path}")
    print(f"TARGET={settings.DATABASE_URL}")
    print(f"SOURCE_TABLES={len(src_tables)}")
    print(f"TARGET_TABLES={len(dst_tables)}")
    print(f"COMMON_TABLES={len(common_tables)}")
    if target_only_tables:
        print("TARGET_ONLY_TABLES=" + ", ".join(target_only_tables))

    src_metadata = MetaData()
    dst_metadata = MetaData()
    src_metadata.reflect(bind=src_engine, only=common_tables)
    dst_metadata.reflect(bind=dst_engine, only=dst_tables)

    source_counts: dict[str, int] = {}
    for table_name in common_tables:
        table = src_metadata.tables[table_name]
        with src_engine.connect() as conn:
            count = conn.execute(select(text("COUNT(*)")).select_from(table)).scalar_one()
        source_counts[table_name] = int(count)
        print(f"SOURCE_COUNT {table_name}={count}")

    if args.dry_run:
        print("DRY_RUN=1")
        return 0

    with dst_engine.begin() as dst_conn:
        clear_target_tables(dst_conn, dst_tables)

        for table_name in common_tables:
            src_table = src_metadata.tables[table_name]
            dst_table = dst_metadata.tables[table_name]
            target_columns = {column.name: column for column in dst_table.columns}
            column_names = [name for name in src_table.columns.keys() if name in target_columns]
            inserted = 0

            with src_engine.connect() as src_conn:
                rows = src_conn.execute(select(src_table)).mappings().all()

            payload: list[dict[str, Any]] = []
            for row in rows:
                item = {
                    column_name: normalize_value(row[column_name], target_columns[column_name])
                    for column_name in column_names
                }
                payload.append(item)

            if payload:
                dst_conn.exec_driver_sql("SET FOREIGN_KEY_CHECKS = 0")
                try:
                    for batch in chunked(payload, BATCH_SIZE):
                        dst_conn.execute(dst_table.insert(), batch)
                        inserted += len(batch)
                finally:
                    dst_conn.exec_driver_sql("SET FOREIGN_KEY_CHECKS = 1")

            reset_auto_increment(dst_conn, dst_table)
            print(f"MIGRATED {table_name}={inserted}")

    print("MIGRATION_COMPLETE=1")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
