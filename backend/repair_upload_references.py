from __future__ import annotations

import argparse
import json
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from sqlalchemy import text

from app.core.config import settings
from app.db.session import SessionLocal


SCALAR_NULL_REPAIRS = (
    ("backend_users", "avatar_url"),
    ("technicians", "avatar_url"),
    ("promotions", "image_url"),
)

DELETE_ROW_REPAIRS = (
    ("store_images", "image_url"),
    ("store_portfolio", "image_url"),
)


@dataclass
class BrokenScalarRef:
    table: str
    column: str
    row_id: int
    url: str
    reason: str


@dataclass
class BrokenReviewImages:
    review_id: int
    original_images: list[str]
    repaired_images: list[str]
    removed_images: list[str]


@dataclass
class BrokenPinRef:
    pin_id: int
    title: str
    url: str
    status: str
    is_deleted: bool


def build_existing_upload_paths(upload_root: Path) -> set[str]:
    if not upload_root.exists():
        return set()
    return {
        f"/uploads/{path.relative_to(upload_root).as_posix()}"
        for path in upload_root.rglob("*")
        if path.is_file()
    }


def collect_scalar_repairs(existing_uploads: set[str]) -> list[BrokenScalarRef]:
    repairs: list[BrokenScalarRef] = []
    with SessionLocal() as db:
        for table_name, column_name in SCALAR_NULL_REPAIRS:
            rows = db.execute(
                text(
                    f"""
                    SELECT id, {column_name}
                    FROM {table_name}
                    WHERE {column_name} IS NOT NULL
                      AND {column_name} LIKE '/uploads/%'
                    """
                )
            ).all()
            for row_id, url in rows:
                normalized = str(url).strip()
                if normalized.startswith("/uploads/"):
                    if normalized not in existing_uploads:
                        repairs.append(
                            BrokenScalarRef(
                                table_name,
                                column_name,
                                int(row_id),
                                normalized,
                                "missing_upload",
                            )
                        )
                    continue
                if normalized.startswith("http://") or normalized.startswith("https://"):
                    continue
                repairs.append(
                    BrokenScalarRef(
                        table_name,
                        column_name,
                        int(row_id),
                        normalized,
                        "invalid_scheme",
                    )
                )
    return repairs


def collect_delete_row_repairs(existing_uploads: set[str]) -> list[BrokenScalarRef]:
    repairs: list[BrokenScalarRef] = []
    with SessionLocal() as db:
        for table_name, column_name in DELETE_ROW_REPAIRS:
            rows = db.execute(
                text(
                    f"""
                    SELECT id, {column_name}
                    FROM {table_name}
                    WHERE {column_name} IS NOT NULL
                      AND {column_name} LIKE '/uploads/%'
                    """
                )
            ).all()
            for row_id, url in rows:
                normalized = str(url).strip()
                if normalized.startswith("/uploads/"):
                    if normalized not in existing_uploads:
                        repairs.append(
                            BrokenScalarRef(
                                table_name,
                                column_name,
                                int(row_id),
                                normalized,
                                "missing_upload",
                            )
                        )
                    continue
                if normalized.startswith("http://") or normalized.startswith("https://"):
                    continue
                repairs.append(
                    BrokenScalarRef(
                        table_name,
                        column_name,
                        int(row_id),
                        normalized,
                        "invalid_scheme",
                    )
                )
    return repairs


def collect_review_repairs(existing_uploads: set[str]) -> list[BrokenReviewImages]:
    repairs: list[BrokenReviewImages] = []
    with SessionLocal() as db:
        rows = db.execute(
            text("SELECT id, images FROM reviews WHERE images IS NOT NULL")
        ).all()
        for review_id, raw_images in rows:
            if raw_images in (None, "", "null"):
                continue
            if isinstance(raw_images, list):
                images = raw_images
            else:
                try:
                    images = json.loads(raw_images)
                except Exception:
                    continue
            if not isinstance(images, list):
                continue
            removed = [
                image
                for image in images
                if isinstance(image, str)
                and (
                    (image.startswith("/uploads/") and image not in existing_uploads)
                    or (
                        not image.startswith("/uploads/")
                        and not image.startswith("http://")
                        and not image.startswith("https://")
                    )
                )
            ]
            if not removed:
                continue
            repaired = [image for image in images if image not in removed]
            repairs.append(
                BrokenReviewImages(
                    review_id=int(review_id),
                    original_images=[str(image) for image in images if isinstance(image, str)],
                    repaired_images=[str(image) for image in repaired if isinstance(image, str)],
                    removed_images=removed,
                )
            )
    return repairs


def collect_pin_repairs(existing_uploads: set[str]) -> tuple[list[BrokenPinRef], list[BrokenPinRef]]:
    auto_delete: list[BrokenPinRef] = []
    manual_review: list[BrokenPinRef] = []
    with SessionLocal() as db:
        rows = db.execute(
            text(
                """
                SELECT id, title, image_url, status, is_deleted
                FROM pins
                WHERE image_url LIKE '/uploads/%'
                """
            )
        ).all()
        for pin_id, title, image_url, status, is_deleted in rows:
            if image_url in existing_uploads:
                continue
            broken = BrokenPinRef(
                pin_id=int(pin_id),
                title=title,
                url=image_url,
                status=status,
                is_deleted=bool(is_deleted),
            )
            if broken.is_deleted:
                auto_delete.append(broken)
            else:
                manual_review.append(broken)
    return auto_delete, manual_review


def build_report(existing_uploads: set[str]) -> dict[str, Any]:
    scalar_repairs = collect_scalar_repairs(existing_uploads)
    delete_row_repairs = collect_delete_row_repairs(existing_uploads)
    review_repairs = collect_review_repairs(existing_uploads)
    pin_auto_delete, pin_manual_review = collect_pin_repairs(existing_uploads)

    by_table: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in scalar_repairs:
        by_table[f"{item.table}.{item.column}.set_null"].append(
            {"id": item.row_id, "url": item.url, "reason": item.reason}
        )
    for item in delete_row_repairs:
        by_table[f"{item.table}.{item.column}.delete_row"].append(
            {"id": item.row_id, "url": item.url, "reason": item.reason}
        )

    return {
        "upload_root": str(Path(settings.UPLOAD_DIR)),
        "existing_upload_file_count": len(existing_uploads),
        "repairs": by_table,
        "reviews": [
            {
                "id": item.review_id,
                "removed_images": item.removed_images,
                "repaired_images": item.repaired_images,
            }
            for item in review_repairs
        ],
        "pins_auto_delete": [
            {
                "id": item.pin_id,
                "title": item.title,
                "url": item.url,
                "status": item.status,
                "is_deleted": item.is_deleted,
            }
            for item in pin_auto_delete
        ],
        "pins_manual_review": [
            {
                "id": item.pin_id,
                "title": item.title,
                "url": item.url,
                "status": item.status,
                "is_deleted": item.is_deleted,
            }
            for item in pin_manual_review
        ],
        "counts": {
            "scalar_set_null": len(scalar_repairs),
            "row_delete": len(delete_row_repairs),
            "review_image_prune": len(review_repairs),
            "pin_auto_delete": len(pin_auto_delete),
            "pin_manual_review": len(pin_manual_review),
        },
    }


def apply_repairs(report: dict[str, Any]) -> None:
    if report["pins_manual_review"]:
        raise SystemExit(
            f"Refusing to modify non-deleted pins with broken uploads: {report['pins_manual_review']}"
        )

    with SessionLocal() as db:
        for key, items in report["repairs"].items():
            table_name, column_name, action = key.split(".")
            if action == "set_null":
                db.execute(
                    text(f"UPDATE {table_name} SET {column_name} = NULL WHERE id = :id"),
                    [{"id": item["id"]} for item in items],
                )
            elif action == "delete_row":
                db.execute(
                    text(f"DELETE FROM {table_name} WHERE id = :id"),
                    [{"id": item["id"]} for item in items],
                )

        for review in report["reviews"]:
            db.execute(
                text("UPDATE reviews SET images = :images WHERE id = :id"),
                {
                    "id": review["id"],
                    "images": json.dumps(review["repaired_images"]),
                },
            )

        if report["pins_auto_delete"]:
            db.execute(
                text("DELETE FROM pins WHERE id = :id"),
                [{"id": item["id"]} for item in report["pins_auto_delete"]],
            )

        db.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit and repair broken /uploads/* references.")
    parser.add_argument("--execute", action="store_true", help="Apply the detected repairs.")
    parser.add_argument("--json", action="store_true", help="Print the report as JSON.")
    args = parser.parse_args()

    existing_uploads = build_existing_upload_paths(Path(settings.UPLOAD_DIR))
    report = build_report(existing_uploads)

    if args.execute:
        apply_repairs(report)
        report["executed"] = True
    else:
        report["executed"] = False

    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return

    print(f"upload_root={report['upload_root']}")
    print(f"existing_upload_file_count={report['existing_upload_file_count']}")
    for key, value in report["counts"].items():
        print(f"{key}={value}")
    if report["pins_manual_review"]:
        print("pins_manual_review:")
        for item in report["pins_manual_review"]:
            print(f"  - {item}")


if __name__ == "__main__":
    main()
