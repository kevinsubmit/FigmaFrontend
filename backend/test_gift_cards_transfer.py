"""
Gift card transfer API test script.
Requires existing users for purchaser and optional recipient.
"""
import os
import json
import urllib.request
import urllib.error

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
PURCHASER_PHONE = os.getenv("TEST_PURCHASER_PHONE")
PURCHASER_PASSWORD = os.getenv("TEST_PURCHASER_PASSWORD")
RECIPIENT_PHONE = os.getenv("TEST_RECIPIENT_PHONE")
RECIPIENT_PASSWORD = os.getenv("TEST_RECIPIENT_PASSWORD")


def _request(method: str, url: str, data: dict | None = None, headers: dict | None = None) -> tuple[int, dict | str]:
    payload = None
    req_headers = headers or {}
    if data is not None:
        payload = json.dumps(data).encode("utf-8")
        req_headers = {**req_headers, "Content-Type": "application/json"}

    req = urllib.request.Request(url, data=payload, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body_bytes = resp.read()
            status = resp.getcode()
    except urllib.error.HTTPError as exc:
        status = exc.code
        body_bytes = exc.read()
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Request failed: {exc}") from exc

    body_text = body_bytes.decode("utf-8") if body_bytes else ""
    try:
        return status, json.loads(body_text) if body_text else {}
    except json.JSONDecodeError:
        return status, body_text


def login(phone: str, password: str) -> str:
    payload = {"phone": phone, "password": password}
    status, body = _request("POST", f"{BASE_URL}/api/v1/auth/login", data=payload)
    if status >= 400:
        raise RuntimeError(f"Login failed ({status}): {body}")
    return body.get("access_token")


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def print_response(label: str, status: int, body: dict | str):
    print(f"\n=== {label} ===")
    print(f"Status: {status}")
    print(json.dumps(body, indent=2) if isinstance(body, dict) else body)
    return body


def main():
    if not PURCHASER_PHONE or not PURCHASER_PASSWORD:
        raise SystemExit("Please set TEST_PURCHASER_PHONE and TEST_PURCHASER_PASSWORD env vars.")

    purchaser_token = login(PURCHASER_PHONE, PURCHASER_PASSWORD)

    # Purchase gift card (transfer)
    purchase_payload = {
        "amount": 50,
        "recipient_phone": RECIPIENT_PHONE or PURCHASER_PHONE,
        "message": "Enjoy your nails!"
    }
    status, purchase_body = _request(
        "POST",
        f"{BASE_URL}/api/v1/gift-cards/purchase",
        data=purchase_payload,
        headers=auth_headers(purchaser_token)
    )
    purchase_body = print_response("Purchase Gift Card", status, purchase_body)
    gift_card_id = purchase_body.get("gift_card", {}).get("id")
    claim_code = purchase_body.get("claim_code")

    # Transfer status
    if gift_card_id:
        status, body = _request(
            "GET",
            f"{BASE_URL}/api/v1/gift-cards/{gift_card_id}/transfer-status",
            headers=auth_headers(purchaser_token)
        )
        print_response("Transfer Status (Purchaser)", status, body)

    # Claim (recipient or self if same phone)
    if claim_code:
        if RECIPIENT_PHONE and RECIPIENT_PASSWORD:
            recipient_token = login(RECIPIENT_PHONE, RECIPIENT_PASSWORD)
            claim_headers = auth_headers(recipient_token)
            label = "Claim Gift Card (Recipient)"
        else:
            claim_headers = auth_headers(purchaser_token)
            label = "Claim Gift Card (Self)"

        status, body = _request(
            "POST",
            f"{BASE_URL}/api/v1/gift-cards/claim",
            data={"claim_code": claim_code},
            headers=claim_headers
        )
        print_response(label, status, body)
    else:
        print("\n[Skip] Claim step: claim_code missing from purchase response.")

    # Revoke (should only work if not claimed)
    if gift_card_id:
        status, body = _request(
            "POST",
            f"{BASE_URL}/api/v1/gift-cards/{gift_card_id}/revoke",
            headers=auth_headers(purchaser_token)
        )
        print_response("Revoke Gift Card (Purchaser)", status, body)


if __name__ == "__main__":
    main()
