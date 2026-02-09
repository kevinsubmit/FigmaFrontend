"""
End-to-end regression script for booking flow + risk control.

Usage example:
  CUSTOMER_PHONE=15551234567 CUSTOMER_PASSWORD=pass123 \
  ADMIN_PHONE=15550000001 ADMIN_PASSWORD=admin123 \
  python test_booking_risk_flow.py
"""
from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import requests


BASE_URL = os.getenv("BASE_URL", "http://localhost:8000/api/v1")
CUSTOMER_PHONE = os.getenv("CUSTOMER_PHONE")
CUSTOMER_PASSWORD = os.getenv("CUSTOMER_PASSWORD")
ADMIN_PHONE = os.getenv("ADMIN_PHONE")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
STORE_ID_ENV = os.getenv("STORE_ID")
SERVICE_ID_ENV = os.getenv("SERVICE_ID")


@dataclass
class StepResult:
    name: str
    ok: bool
    message: str


def _log(msg: str) -> None:
    print(msg, flush=True)


def _request_json(
    method: str,
    path: str,
    token: Optional[str] = None,
    expected_statuses: Tuple[int, ...] = (200,),
    **kwargs: Any,
) -> Tuple[bool, Optional[Dict[str, Any]], requests.Response]:
    headers = kwargs.pop("headers", {})
    if token:
        headers["Authorization"] = f"Bearer {token}"
    response = requests.request(method, f"{BASE_URL}{path}", headers=headers, timeout=20, **kwargs)
    ok = response.status_code in expected_statuses
    data = None
    try:
        data = response.json()
    except Exception:
        data = None
    return ok, data, response


def login(phone: str, password: str) -> Optional[str]:
    ok, data, resp = _request_json(
        "POST",
        "/auth/login",
        json={"phone": phone, "password": password},
        expected_statuses=(200,),
    )
    if not ok or not data or "access_token" not in data:
        _log(f"[FAIL] 登录失败 phone={phone} status={resp.status_code} body={resp.text}")
        return None
    return data["access_token"]


def pick_store_and_service() -> Optional[Tuple[int, int]]:
    if STORE_ID_ENV and SERVICE_ID_ENV:
        return int(STORE_ID_ENV), int(SERVICE_ID_ENV)

    ok, stores, resp = _request_json("GET", "/stores?limit=20", expected_statuses=(200,))
    if not ok or not isinstance(stores, list) or not stores:
        _log(f"[FAIL] 获取门店失败 status={resp.status_code} body={resp.text}")
        return None

    for store in stores:
        store_id = store.get("id")
        if not store_id:
            continue
        ok2, services, resp2 = _request_json("GET", f"/services/stores/{store_id}", expected_statuses=(200,))
        if not ok2 or not isinstance(services, list):
            continue
        for svc in services:
            if svc.get("id"):
                return int(store_id), int(svc["id"])

    _log("[FAIL] 未找到可用 service，请先在店铺配置 service-catalog 并启用服务")
    return None


def create_appointment(
    token: str,
    store_id: int,
    service_id: int,
    appointment_date: str,
    appointment_time: str,
    notes: str,
    expected_statuses: Tuple[int, ...] = (200, 201),
) -> Tuple[bool, Optional[Dict[str, Any]], requests.Response]:
    return _request_json(
        "POST",
        "/appointments",
        token=token,
        expected_statuses=expected_statuses,
        json={
            "store_id": store_id,
            "service_id": service_id,
            "appointment_date": appointment_date,
            "appointment_time": appointment_time,
            "notes": notes,
        },
    )


def run() -> int:
    results: List[StepResult] = []

    if not CUSTOMER_PHONE or not CUSTOMER_PASSWORD:
        _log("[FAIL] 缺少 CUSTOMER_PHONE / CUSTOMER_PASSWORD 环境变量")
        return 2

    customer_token = login(CUSTOMER_PHONE, CUSTOMER_PASSWORD)
    if not customer_token:
        return 2
    results.append(StepResult("客户登录", True, "成功"))

    ids = pick_store_and_service()
    if not ids:
        return 2
    store_id, service_id = ids
    results.append(StepResult("选择门店服务", True, f"store_id={store_id}, service_id={service_id}"))

    # Step 1: 过去时间应被拒绝
    now = datetime.now()
    past_time = (now - timedelta(hours=1)).strftime("%H:%M:%S")
    today = now.date().isoformat()
    ok, data, resp = create_appointment(
        customer_token,
        store_id,
        service_id,
        today,
        past_time,
        "e2e-past-time-check",
        expected_statuses=(400,),
    )
    if ok:
        detail = (data or {}).get("detail")
        msg = str(detail) if detail else "收到 400（符合预期）"
        results.append(StepResult("过去时间拦截", True, msg))
    else:
        results.append(StepResult("过去时间拦截", False, f"status={resp.status_code}, body={resp.text}"))

    # Step 2: 未来时间预约应成功
    tomorrow = (now + timedelta(days=1)).date().isoformat()
    ok, created, resp = create_appointment(
        customer_token,
        store_id,
        service_id,
        tomorrow,
        "10:00:00",
        "e2e-booking-flow",
    )
    appointment_id: Optional[int] = None
    if ok and created and created.get("id"):
        appointment_id = int(created["id"])
        results.append(StepResult("未来时间预约", True, f"appointment_id={appointment_id}"))
    else:
        results.append(StepResult("未来时间预约", False, f"status={resp.status_code}, body={resp.text}"))

    # Step 3: 客户端列表应可见
    if appointment_id:
        ok, my_appointments, resp = _request_json(
            "GET",
            "/appointments?limit=50",
            token=customer_token,
            expected_statuses=(200,),
        )
        if ok and isinstance(my_appointments, list) and any(a.get("id") == appointment_id for a in my_appointments):
            results.append(StepResult("客户列表可见", True, f"id={appointment_id}"))
        else:
            results.append(StepResult("客户列表可见", False, f"status={resp.status_code}, body={resp.text}"))

    admin_token: Optional[str] = None
    if ADMIN_PHONE and ADMIN_PASSWORD:
        admin_token = login(ADMIN_PHONE, ADMIN_PASSWORD)
        if admin_token:
            results.append(StepResult("管理员登录", True, "成功"))
        else:
            results.append(StepResult("管理员登录", False, "失败，跳过 no-show/风控步骤"))
    else:
        results.append(StepResult("管理员登录", False, "未提供 ADMIN_PHONE/ADMIN_PASSWORD，跳过 no-show/风控步骤"))

    # Step 4: 管理员 no-show
    if admin_token and appointment_id:
        ok, no_show_data, resp = _request_json(
            "POST",
            f"/appointments/{appointment_id}/no-show",
            token=admin_token,
            expected_statuses=(200,),
        )
        if ok and no_show_data:
            status = str(no_show_data.get("status"))
            cancel_reason = str(no_show_data.get("cancel_reason"))
            valid = status == "cancelled" and cancel_reason.lower() == "no show"
            results.append(
                StepResult(
                    "管理员标记No Show",
                    valid,
                    f"status={status}, cancel_reason={cancel_reason}",
                )
            )
        else:
            results.append(StepResult("管理员标记No Show", False, f"status={resp.status_code}, body={resp.text}"))

        # Step 5: 风控页应看到 no_show_30d 增加
        ok, risk_users, resp = _request_json(
            "GET",
            f"/risk/users?keyword={CUSTOMER_PHONE}&limit=20",
            token=admin_token,
            expected_statuses=(200,),
        )
        if ok and isinstance(risk_users, list) and risk_users:
            user = risk_users[0]
            no_show_30d = int(user.get("no_show_30d") or 0)
            results.append(
                StepResult(
                    "风控数据回写",
                    no_show_30d >= 1,
                    f"no_show_30d={no_show_30d}, risk_level={user.get('risk_level')}",
                )
            )
        else:
            results.append(StepResult("风控数据回写", False, f"status={resp.status_code}, body={resp.text}"))

    _log("\n========== 回归结果 ==========")
    has_fail = False
    for item in results:
        tag = "PASS" if item.ok else "FAIL"
        _log(f"[{tag}] {item.name}: {item.message}")
        if not item.ok:
            has_fail = True
    _log("=============================\n")

    return 1 if has_fail else 0


if __name__ == "__main__":
    sys.exit(run())
