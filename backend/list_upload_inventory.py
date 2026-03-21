"""
List upload storage inventory without modifying files.

Usage:
  python list_upload_inventory.py
  python list_upload_inventory.py --path /app/uploads --limit 50
  python list_upload_inventory.py --path /app/uploads --json
"""
from __future__ import annotations

import argparse
import json
from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


@dataclass
class FileEntry:
    relative_path: str
    top_level_dir: str
    size_bytes: int
    modified_at: str
    modified_ts: float


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="List upload storage inventory")
    parser.add_argument("--path", default="./uploads", help="Upload root path to inspect")
    parser.add_argument("--limit", type=int, default=100, help="Max files to print in text mode")
    parser.add_argument("--json", action="store_true", help="Output JSON instead of text")
    return parser.parse_args()


def resolve_root(path_str: str) -> Path:
    root = Path(path_str).expanduser()
    if not root.is_absolute():
        root = (Path.cwd() / root).resolve()
    return root


def iso_utc(timestamp: float) -> str:
    return datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()


def collect_files(root: Path) -> list[FileEntry]:
    if not root.exists():
        return []

    entries: list[FileEntry] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        stat = path.stat()
        rel = path.relative_to(root).as_posix()
        top_level_dir = rel.split("/", 1)[0] if "/" in rel else "."
        entries.append(
            FileEntry(
                relative_path=rel,
                top_level_dir=top_level_dir,
                size_bytes=int(stat.st_size),
                modified_at=iso_utc(stat.st_mtime),
                modified_ts=float(stat.st_mtime),
            )
        )
    return entries


def build_summary(entries: Iterable[FileEntry]) -> dict[str, dict[str, int]]:
    grouped: dict[str, dict[str, int]] = defaultdict(lambda: {"file_count": 0, "size_bytes": 0})
    for entry in entries:
        bucket = grouped[entry.top_level_dir]
        bucket["file_count"] += 1
        bucket["size_bytes"] += entry.size_bytes
    return dict(sorted(grouped.items(), key=lambda item: item[0]))


def human_size(size_bytes: int) -> str:
    units = ["B", "KB", "MB", "GB", "TB"]
    value = float(size_bytes)
    unit = units[0]
    for unit in units:
        if value < 1024.0 or unit == units[-1]:
            break
        value /= 1024.0
    return f"{value:.1f}{unit}"


def print_text(root: Path, entries: list[FileEntry], limit: int) -> None:
    total_size = sum(entry.size_bytes for entry in entries)
    print(f"UPLOAD_ROOT {root}")
    print(f"FILE_COUNT {len(entries)}")
    print(f"TOTAL_SIZE_BYTES {total_size}")
    print(f"TOTAL_SIZE_HUMAN {human_size(total_size)}")
    print("")
    print("BY_TOP_LEVEL_DIR")
    for directory, bucket in build_summary(entries).items():
        print(
            f"  {directory}: files={bucket['file_count']}, "
            f"size_bytes={bucket['size_bytes']}, size_human={human_size(bucket['size_bytes'])}"
        )
    print("")
    print(f"FILES_NEWEST_FIRST limit={limit}")
    for entry in sorted(entries, key=lambda item: item.modified_ts, reverse=True)[: max(0, limit)]:
        print(
            f"  {entry.modified_at} | {entry.size_bytes:>8} bytes | "
            f"{entry.relative_path}"
        )


def main() -> int:
    args = parse_args()
    root = resolve_root(args.path)
    entries = collect_files(root)
    payload = {
        "upload_root": str(root),
        "file_count": len(entries),
        "total_size_bytes": sum(entry.size_bytes for entry in entries),
        "by_top_level_dir": build_summary(entries),
        "files": [asdict(entry) for entry in sorted(entries, key=lambda item: item.modified_ts, reverse=True)],
    }
    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print_text(root, entries, args.limit)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
