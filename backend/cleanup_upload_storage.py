"""
Dry-run-first upload storage cleanup tool.

Usage:
  python cleanup_upload_storage.py
  python cleanup_upload_storage.py --path /app/uploads
  python cleanup_upload_storage.py --path /app/uploads --older-than-days 30
  python cleanup_upload_storage.py --path /app/uploads --execute
"""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Cleanup upload storage")
    parser.add_argument("--path", default="./uploads", help="Upload root path to clean")
    parser.add_argument(
        "--older-than-days",
        type=float,
        default=None,
        help="Only target files older than this many days",
    )
    parser.add_argument("--execute", action="store_true", help="Actually delete files")
    args = parser.parse_args()
    if args.older_than_days is not None and args.older_than_days < 0:
        parser.error("--older-than-days must be >= 0")
    return args


def resolve_root(path_str: str) -> Path:
    root = Path(path_str).expanduser()
    if not root.is_absolute():
        root = (Path.cwd() / root).resolve()
    return root


def collect_files(root: Path) -> list[Path]:
    if not root.exists():
        return []
    return [path for path in sorted(root.rglob("*")) if path.is_file()]


def select_target_files(files: list[Path], older_than_days: float | None) -> tuple[list[Path], datetime | None]:
    if older_than_days is None:
        return files, None
    cutoff = datetime.now(timezone.utc) - timedelta(days=float(older_than_days))
    selected = [
        path
        for path in files
        if datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc) <= cutoff
    ]
    return selected, cutoff


def human_size(size_bytes: int) -> str:
    units = ["B", "KB", "MB", "GB", "TB"]
    value = float(size_bytes)
    unit = units[0]
    for unit in units:
        if value < 1024.0 or unit == units[-1]:
            break
        value /= 1024.0
    return f"{value:.1f}{unit}"


def remove_empty_dirs(root: Path) -> int:
    removed = 0
    if not root.exists():
        return removed
    for path in sorted((p for p in root.rglob("*") if p.is_dir()), key=lambda item: len(item.parts), reverse=True):
        try:
            path.rmdir()
            removed += 1
        except OSError:
            continue
    return removed


def main() -> int:
    args = parse_args()
    root = resolve_root(args.path)
    all_files = collect_files(root)
    files, cutoff = select_target_files(all_files, args.older_than_days)
    total_size = sum(path.stat().st_size for path in files)

    print(f"UPLOAD_ROOT {root}")
    print(f"ALL_FILE_COUNT {len(all_files)}")
    print(f"TARGET_FILE_COUNT {len(files)}")
    print(f"TARGET_SIZE_BYTES {total_size}")
    print(f"TARGET_SIZE_HUMAN {human_size(total_size)}")
    if cutoff is not None:
        print(f"CUTOFF_UTC {cutoff.isoformat()}")
        print(f"OLDER_THAN_DAYS {args.older_than_days}")

    if not args.execute:
        print("")
        print("DRY_RUN 1")
        if cutoff is None:
            print("No files deleted. Re-run with --execute to remove all files under this root.")
        else:
            print("No files deleted. Re-run with --execute to remove matching files older than the cutoff.")
        return 0

    deleted_files = 0
    deleted_bytes = 0
    for path in files:
        size = path.stat().st_size
        path.unlink()
        deleted_files += 1
        deleted_bytes += size

    deleted_dirs = remove_empty_dirs(root)

    print("")
    print("DRY_RUN 0")
    print(f"DELETED_FILE_COUNT {deleted_files}")
    print(f"DELETED_SIZE_BYTES {deleted_bytes}")
    print(f"DELETED_SIZE_HUMAN {human_size(deleted_bytes)}")
    print(f"REMOVED_EMPTY_DIR_COUNT {deleted_dirs}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
