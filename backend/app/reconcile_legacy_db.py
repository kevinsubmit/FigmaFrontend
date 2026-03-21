"""
CLI for reconciling legacy unmanaged databases and stamping Alembic head.
"""
from __future__ import annotations

import argparse
import json
import sys

from app.db.legacy_alembic import (
    ADDITIVE_DIFF_TYPES,
    apply_additive_diffs,
    collect_schema_diffs,
    get_current_revision,
    get_head_revision,
    has_alembic_version_table,
    is_legacy_unmanaged_database,
    stamp_head,
    summarize_diffs,
)
from app.db.session import engine


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Reconcile a legacy unmanaged database and optionally stamp Alembic head.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only print what would be applied. Do not mutate schema or stamp Alembic head.",
    )
    parser.add_argument(
        "--no-stamp",
        action="store_true",
        help="Apply reconcile changes but do not stamp Alembic head.",
    )
    parser.add_argument(
        "--adopt-managed",
        action="store_true",
        help=(
            "Allow reconciling and stamping a database that already has alembic_version "
            "but is behind head. Intended for legacy development databases whose schema "
            "was partially advanced outside Alembic."
        ),
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    engine.echo = False

    with engine.connect() as connection:
        managed = has_alembic_version_table(connection)
        legacy_unmanaged = is_legacy_unmanaged_database(connection)
        current_revision = get_current_revision(connection)
        before_diffs = collect_schema_diffs(connection)
    head_revision = get_head_revision()

    print(
        json.dumps(
            {
                "managed": managed,
                "legacy_unmanaged": legacy_unmanaged,
                "current_revision": current_revision,
                "head_revision": head_revision,
                "before_diff_summary": summarize_diffs(before_diffs),
            },
            ensure_ascii=False,
        )
    )

    if managed:
        if current_revision == head_revision:
            print("Database is already managed at Alembic head.")
            return 0
        if not args.adopt_managed:
            print(
                "Database already has alembic_version but is behind head. "
                "Use `alembic upgrade head` for normal upgrades, or rerun this command "
                "with `--adopt-managed` only for legacy development databases whose schema "
                "was partially advanced outside Alembic."
            )
            return 1

    if not managed and not legacy_unmanaged:
        print("Database does not look like a legacy unmanaged app database. Refusing to stamp automatically.")
        return 1

    additive_diffs = [diff for diff in before_diffs if diff[0] in ADDITIVE_DIFF_TYPES]
    if additive_diffs:
        with engine.begin() as connection:
            applied = apply_additive_diffs(connection, additive_diffs, dry_run=args.dry_run)
        print(json.dumps({"applied": applied}, ensure_ascii=False))
    else:
        print(json.dumps({"applied": []}, ensure_ascii=False))

    with engine.connect() as connection:
        after_diffs = collect_schema_diffs(connection)

    remaining_summary = summarize_diffs(after_diffs)
    print(json.dumps({"after_diff_summary": remaining_summary}, ensure_ascii=False))

    remaining_additive = [diff for diff in after_diffs if diff[0] in ADDITIVE_DIFF_TYPES]
    if remaining_additive:
        print("Remaining additive diffs still exist. Refusing to stamp Alembic head.")
        return 1

    if args.dry_run:
        print("Dry run only. Alembic head was not stamped.")
        return 0

    if args.no_stamp:
        print("Reconcile complete. Alembic head was not stamped because --no-stamp was provided.")
        return 0

    stamp_head()
    print("Stamped Alembic head successfully.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
