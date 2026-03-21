"""
Dry-run-first upload storage cleanup tool.

Usage:
  python cleanup_upload_storage.py
  python cleanup_upload_storage.py --path /app/uploads
  python cleanup_upload_storage.py --path /app/uploads --execute
"""
from __future__ import annotations

import argparse
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Cleanup upload storage")
    parser.add_argument("--path", default="./uploads", help="Upload root path to clean")
    parser.add_argument("--execute", action="store_true", help="Actually delete files")
    return parser.parse_args()


def resolve_root(path_str: str) -> Path:
    root = Path(path_str).expanduser()
    if not root.is_absolute():
        root = (Path.cwd() / root).resolve()
    return root


def collect_files(root: Path) -> list[Path]:
    if not root.exists():
        return []
    return [path for path in sorted(root.rglob("*")) if path.is_file()]


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
    files = collect_files(root)
    total_size = sum(path.stat().st_size for path in files)

    print(f"UPLOAD_ROOT {root}")
    print(f"FILE_COUNT {len(files)}")
    print(f"TOTAL_SIZE_BYTES {total_size}")
    print(f"TOTAL_SIZE_HUMAN {human_size(total_size)}")

    if not args.execute:
        print("")
        print("DRY_RUN 1")
        print("No files deleted. Re-run with --execute to remove all files under this root.")
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
