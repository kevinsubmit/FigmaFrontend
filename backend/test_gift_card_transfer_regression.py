"""
End-to-end regression script for gift card transfer / claim / revoke flow.

Flow covered:
1. Cleanup previous dynamic regression data
2. Register/login sender + recipient A + recipient B
3. Sender purchases card A for self
4. Sender transfers card A to recipient A
5. Wrong recipient claim is rejected
6. Recipient A claims card A
7. Sender purchases card B for self
8. Sender transfers card B to recipient B
9. Sender revokes card B before claim
10. Validate summaries, transfer status, and transaction history

Usage:
  cd backend
  python test_gift_card_transfer_regression.py
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional, Sequence, Tuple

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.gift_card import GiftCardTransaction


BASE_URL = os.getenv("BASE_URL", "http://localhost:8000/api/v1").rstrip("/")
CLEANUP_BEFORE = os.getenv("CLEANUP_BEFORE", "1") != "0"
CLEANUP_AFTER = os.getenv("CLEANUP_AFTER", "1") == "1"

SENDER_PHONE = os.getenv("SENDER_PHONE", "2126663647")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD", "GiftSenderPass123")
SENDER_USERNAME = os.getenv("SENDER_USERNAME", "gift_sender")

RECIPIENT_A_PHONE = os.getenv("RECIPIENT_A_PHONE", "2126663648")
RECIPIENT_A_PASSWORD = os.getenv("RECIPIENT_A_PASSWORD", "GiftRecipientAPass123")
RECIPIENT_A_USERNAME = os.getenv("RECIPIENT_A_USERNAME", "gift_recipient_a")

RECIPIENT_B_PHONE = os.getenv("RECIPIENT_B_PHONE", "2126663649")
RECIPIENT_B_PASSWORD = os.getenv("RECIPIENT_B_PASSWORD", "GiftRecipientBPass123")
RECIPIENT_B_USERNAME = os.getenv("RECIPIENT_B_USERNAME", "gift_recipient_b")

CARD_A_AMOUNT = float(os.getenv("CARD_A_AMOUNT", "40"))
CARD_B_AMOUNT = float(os.getenv("CARD_B_AMOUNT", "25"))

TRUNCATE_TABLES: Sequence[str] = (
    "appointment_groups",
    "appointment_reminders",
    "appointment_service_items",
    "appointment_settlement_events",
    "appointment_staff_splits",
    "appointments",
    "backend_users",
    "coupon_phone_grants",
    "coupons",
    "gift_card_transactions",
    "gift_cards",
    "notifications",
    "pin_favorites",
    "point_transactions",
    "promotion_services",
    "promotions",
    "push_device_tokens",
    "referrals",
    "review_replies",
    "reviews",
    "risk_events",
    "security_block_logs",
    "services",
    "store_admin_applications",
    "store_blocked_slots",
    "store_favorites",
    "store_hours",
    "store_images",
    "store_portfolio",
    "stores",
    "system_logs",
    "technician_unavailable",
    "technicians",
    "user_coupons",
    "user_points",
    "user_risk_states",
    "verification_codes",
)


def log(message: str) -> None:
    print(message, flush=True)


def assert_equal(actual: Any, expected: Any, label: str) -> None:
    if actual != expected:
        raise AssertionError(f"{label}: expected {expected!r}, got {actual!r}")


def assert_close(actual: Any, expected: float, label: str, eps: float = 0.01) -> None:
    if abs(float(actual) - float(expected)) > eps:
        raise AssertionError(f"{label}: expected {expected}, got {actual}")


def assert_true(condition: bool, label: str) -> None:
    if not condition:
        raise AssertionError(label)


def request_json(
    method: str,
    path: str,
    *,
    token: Optional[str] = None,
    expected_statuses: Tuple[int, ...] = (200,),
    **kwargs: Any,
) -> Dict[str, Any] | List[Any]:
    headers = kwargs.pop("headers", {})
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = kwargs.pop("json", None)
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        headers = {**headers, "Content-Type": "application/json"}
    req = urllib.request.Request(
        url=f"{BASE_URL}{path}",
        data=body,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            status = response.getcode()
            raw = response.read().decode("utf-8") if response.length != 0 else ""
    except urllib.error.HTTPError as exc:
        status = exc.code
        raw = exc.read().decode("utf-8") if exc.fp else ""
    except urllib.error.URLError as exc:
        raise RuntimeError(f"{method} {path} failed to connect: {exc}") from exc

    try:
        payload = json.loads(raw) if raw else {}
    except Exception:
        payload = {"raw": raw}

    if status not in expected_statuses:
        raise RuntimeError(f"{method} {path} failed: status={status}, body={payload}")
    return payload


def cleanup_dynamic_data() -> None:
    log("[STEP] Cleanup dynamic regression data")
    db: Session = SessionLocal()
    try:
        db.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        for table_name in TRUNCATE_TABLES:
            db.execute(text(f"TRUNCATE TABLE {table_name}"))
        db.execute(text("SET FOREIGN_KEY_CHECKS=1"))
        db.commit()
    finally:
        db.close()


def send_register_code(phone: str) -> None:
    request_json(
        "POST",
        "/auth/send-verification-code",
        expected_statuses=(200,),
        json={"phone": phone, "purpose": "register"},
    )
    verify = request_json(
        "POST",
        "/auth/verify-code",
        expected_statuses=(200,),
        json={"phone": phone, "code": "123456", "purpose": "register"},
    )
    assert_equal(verify["valid"], True, f"verification valid for {phone}")


def register_user(
    *,
    phone: str,
    username: str,
    password: str,
    full_name: str,
    email: str,
) -> Dict[str, Any]:
    send_register_code(phone)
    return request_json(
        "POST",
        "/auth/register",
        expected_statuses=(201,),
        json={
            "phone": phone,
            "username": username,
            "full_name": full_name,
            "email": email,
            "password": password,
            "verification_code": "123456",
        },
    )


def login(phone: str, password: str, portal: str = "frontend") -> str:
    payload = request_json(
        "POST",
        "/auth/login",
        expected_statuses=(200,),
        json={"phone": phone, "password": password, "login_portal": portal},
    )
    token = payload.get("access_token")
    if not token:
        raise RuntimeError(f"login missing access_token for phone={phone}")
    return str(token)


def get_card(cards: List[Dict[str, Any]], gift_card_id: int) -> Dict[str, Any]:
    for item in cards:
        if int(item["id"]) == gift_card_id:
            return item
    raise AssertionError(f"gift card not found in my-cards: {gift_card_id}")


def get_transaction_types(gift_card_id: int) -> List[str]:
    db: Session = SessionLocal()
    try:
        rows = db.execute(
            select(GiftCardTransaction.transaction_type)
            .where(GiftCardTransaction.gift_card_id == gift_card_id)
            .order_by(GiftCardTransaction.id.asc())
        ).all()
        return [str(row[0]) for row in rows]
    finally:
        db.close()


def run_api_flow() -> Dict[str, Any]:
    log("[STEP] Register and login sender / recipient A / recipient B")
    sender_user = register_user(
        phone=SENDER_PHONE,
        username=SENDER_USERNAME,
        password=SENDER_PASSWORD,
        full_name="Gift Sender",
        email="gift-sender@example.com",
    )
    recipient_a_user = register_user(
        phone=RECIPIENT_A_PHONE,
        username=RECIPIENT_A_USERNAME,
        password=RECIPIENT_A_PASSWORD,
        full_name="Gift Recipient A",
        email="gift-recipient-a@example.com",
    )
    recipient_b_user = register_user(
        phone=RECIPIENT_B_PHONE,
        username=RECIPIENT_B_USERNAME,
        password=RECIPIENT_B_PASSWORD,
        full_name="Gift Recipient B",
        email="gift-recipient-b@example.com",
    )

    sender_token = login(SENDER_PHONE, SENDER_PASSWORD)
    recipient_a_token = login(RECIPIENT_A_PHONE, RECIPIENT_A_PASSWORD)
    recipient_b_token = login(RECIPIENT_B_PHONE, RECIPIENT_B_PASSWORD)

    log("[STEP] Sender purchases card A for self")
    purchase_a = request_json(
        "POST",
        "/gift-cards/purchase",
        token=sender_token,
        expected_statuses=(200,),
        json={"amount": CARD_A_AMOUNT},
    )
    card_a = purchase_a["gift_card"]
    card_a_id = int(card_a["id"])
    assert_equal(card_a["status"], "active", "card A initial status")
    assert_close(card_a["balance"], CARD_A_AMOUNT, "card A initial balance")

    sender_summary_after_purchase_a = request_json("GET", "/gift-cards/summary", token=sender_token, expected_statuses=(200,))
    assert_equal(sender_summary_after_purchase_a["active_count"], 1, "sender active count after card A purchase")
    assert_equal(sender_summary_after_purchase_a["total_count"], 1, "sender total count after card A purchase")
    assert_close(sender_summary_after_purchase_a["total_balance"], CARD_A_AMOUNT, "sender balance after card A purchase")

    log("[STEP] Sender transfers card A to recipient A")
    transfer_a = request_json(
        "POST",
        f"/gift-cards/{card_a_id}/transfer",
        token=sender_token,
        expected_statuses=(200,),
        json={"recipient_phone": RECIPIENT_A_PHONE, "message": "Card A transfer"},
    )
    transferred_card_a = transfer_a["gift_card"]
    claim_code_a = transfer_a["claim_code"]
    assert_true(bool(claim_code_a), "card A claim code present in debug")
    assert_equal(transferred_card_a["status"], "pending_transfer", "card A status after transfer")
    assert_equal(transferred_card_a["recipient_phone"], "1" + "".join(ch for ch in RECIPIENT_A_PHONE if ch.isdigit())[-10:], "card A recipient phone")

    sender_cards_after_transfer_a = request_json("GET", "/gift-cards/my-cards", token=sender_token, expected_statuses=(200,))
    sender_card_a_after_transfer = get_card(sender_cards_after_transfer_a, card_a_id)
    assert_equal(sender_card_a_after_transfer["status"], "pending_transfer", "sender sees card A pending transfer")
    sender_transfer_status_a = request_json(
        "GET",
        f"/gift-cards/{card_a_id}/transfer-status",
        token=sender_token,
        expected_statuses=(200,),
    )
    assert_equal(sender_transfer_status_a["status"], "pending_transfer", "transfer status A pending")

    sender_summary_after_transfer_a = request_json("GET", "/gift-cards/summary", token=sender_token, expected_statuses=(200,))
    assert_equal(sender_summary_after_transfer_a["active_count"], 0, "sender active count after transfer A")
    assert_equal(sender_summary_after_transfer_a["total_count"], 1, "sender total count after transfer A")
    assert_close(sender_summary_after_transfer_a["total_balance"], 0, "sender balance after transfer A")

    log("[STEP] Wrong recipient claim for card A is rejected")
    wrong_claim = request_json(
        "POST",
        "/gift-cards/claim",
        token=recipient_b_token,
        expected_statuses=(403,),
        json={"claim_code": claim_code_a},
    )
    assert_equal(wrong_claim["detail"], "Recipient phone mismatch", "wrong recipient claim rejection")

    log("[STEP] Recipient A claims card A")
    claim_a = request_json(
        "POST",
        "/gift-cards/claim",
        token=recipient_a_token,
        expected_statuses=(200,),
        json={"claim_code": claim_code_a},
    )
    claimed_card_a = claim_a["gift_card"]
    assert_equal(claimed_card_a["status"], "active", "card A status after claim")
    assert_equal(int(claimed_card_a["user_id"]), int(recipient_a_user["id"]), "card A owner after claim")
    assert_equal(int(claimed_card_a["claimed_by_user_id"]), int(recipient_a_user["id"]), "card A claimed_by after claim")

    sender_cards_after_claim_a = request_json("GET", "/gift-cards/my-cards", token=sender_token, expected_statuses=(200,))
    recipient_a_cards_after_claim_a = request_json("GET", "/gift-cards/my-cards", token=recipient_a_token, expected_statuses=(200,))
    assert_true(all(int(item["id"]) != card_a_id for item in sender_cards_after_claim_a), "sender no longer owns card A after claim")
    recipient_a_card_a = get_card(recipient_a_cards_after_claim_a, card_a_id)
    assert_equal(recipient_a_card_a["status"], "active", "recipient A sees active card A")

    recipient_a_summary_after_claim = request_json("GET", "/gift-cards/summary", token=recipient_a_token, expected_statuses=(200,))
    assert_equal(recipient_a_summary_after_claim["active_count"], 1, "recipient A active count after claim")
    assert_equal(recipient_a_summary_after_claim["total_count"], 1, "recipient A total count after claim")
    assert_close(recipient_a_summary_after_claim["total_balance"], CARD_A_AMOUNT, "recipient A balance after claim")

    sender_transfer_status_a_after_claim = request_json(
        "GET",
        f"/gift-cards/{card_a_id}/transfer-status",
        token=sender_token,
        expected_statuses=(200,),
    )
    assert_equal(sender_transfer_status_a_after_claim["status"], "active", "sender can still see card A active after claim")

    log("[STEP] Sender purchases card B and transfers it to recipient B")
    purchase_b = request_json(
        "POST",
        "/gift-cards/purchase",
        token=sender_token,
        expected_statuses=(200,),
        json={"amount": CARD_B_AMOUNT},
    )
    card_b = purchase_b["gift_card"]
    card_b_id = int(card_b["id"])
    assert_equal(card_b["status"], "active", "card B initial status")

    transfer_b = request_json(
        "POST",
        f"/gift-cards/{card_b_id}/transfer",
        token=sender_token,
        expected_statuses=(200,),
        json={"recipient_phone": RECIPIENT_B_PHONE, "message": "Card B transfer"},
    )
    transferred_card_b = transfer_b["gift_card"]
    claim_code_b = transfer_b["claim_code"]
    assert_true(bool(claim_code_b), "card B claim code present in debug")
    assert_equal(transferred_card_b["status"], "pending_transfer", "card B status after transfer")

    transfer_status_b_pending = request_json(
        "GET",
        f"/gift-cards/{card_b_id}/transfer-status",
        token=sender_token,
        expected_statuses=(200,),
    )
    assert_equal(transfer_status_b_pending["status"], "pending_transfer", "transfer status B pending")

    log("[STEP] Sender revokes card B before claim")
    revoke_b = request_json(
        "POST",
        f"/gift-cards/{card_b_id}/revoke",
        token=sender_token,
        expected_statuses=(200,),
    )
    revoked_card_b = revoke_b["gift_card"]
    assert_equal(revoked_card_b["status"], "revoked", "card B status after revoke")

    sender_cards_after_revoke_b = request_json("GET", "/gift-cards/my-cards", token=sender_token, expected_statuses=(200,))
    sender_card_b = get_card(sender_cards_after_revoke_b, card_b_id)
    assert_equal(sender_card_b["status"], "revoked", "sender sees revoked card B")

    sender_summary_after_revoke_b = request_json("GET", "/gift-cards/summary", token=sender_token, expected_statuses=(200,))
    assert_equal(sender_summary_after_revoke_b["active_count"], 0, "sender active count after revoke B")
    assert_equal(sender_summary_after_revoke_b["total_count"], 1, "sender total count after revoke B")
    assert_close(sender_summary_after_revoke_b["total_balance"], 0, "sender balance after revoke B")

    transfer_status_b_revoked = request_json(
        "GET",
        f"/gift-cards/{card_b_id}/transfer-status",
        token=sender_token,
        expected_statuses=(200,),
    )
    assert_equal(transfer_status_b_revoked["status"], "revoked", "transfer status B revoked")

    revoked_claim = request_json(
        "POST",
        "/gift-cards/claim",
        token=recipient_b_token,
        expected_statuses=(400,),
        json={"claim_code": claim_code_b},
    )
    assert_equal(revoked_claim["detail"], "Gift card is not claimable", "revoked card claim rejection")

    log("[STEP] Validate transaction history")
    transaction_types_a = get_transaction_types(card_a_id)
    transaction_types_b = get_transaction_types(card_b_id)
    assert_equal(transaction_types_a, ["purchase", "transfer_sent", "transfer_claimed"], "card A transactions")
    assert_equal(transaction_types_b, ["purchase", "transfer_sent", "revoked"], "card B transactions")

    recipient_b_summary = request_json("GET", "/gift-cards/summary", token=recipient_b_token, expected_statuses=(200,))
    assert_equal(recipient_b_summary["total_count"], 0, "recipient B total count remains zero")
    assert_close(recipient_b_summary["total_balance"], 0, "recipient B balance remains zero")

    return {
        "sender_user_id": int(sender_user["id"]),
        "recipient_a_user_id": int(recipient_a_user["id"]),
        "recipient_b_user_id": int(recipient_b_user["id"]),
        "card_a_id": card_a_id,
        "card_b_id": card_b_id,
        "card_a_claim_code": claim_code_a,
        "card_b_claim_code": claim_code_b,
        "card_a_transactions": transaction_types_a,
        "card_b_transactions": transaction_types_b,
        "recipient_a_final_balance": recipient_a_summary_after_claim["total_balance"],
        "sender_final_total_count": sender_summary_after_revoke_b["total_count"],
    }


def main() -> int:
    if CLEANUP_BEFORE:
        cleanup_dynamic_data()

    summary: Optional[Dict[str, Any]] = None
    try:
        summary = run_api_flow()
        log("OK: gift card transfer regression passed")
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:
        log(f"FAIL: gift card transfer regression failed: {exc}")
        return 1
    finally:
        if CLEANUP_AFTER:
            cleanup_dynamic_data()


if __name__ == "__main__":
    sys.exit(main())
