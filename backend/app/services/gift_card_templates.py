from __future__ import annotations

from typing import Any

DEFAULT_GIFT_CARD_TEMPLATE_KEY = "minimal_gold"

GIFT_CARD_TEMPLATES: list[dict[str, str]] = [
    {
        "key": "minimal_gold",
        "name": "Minimal Gold",
        "description": "Clean black-and-gold card with a premium finish.",
        "icon_key": "sparkles",
        "accent_start_hex": "#F4D27A",
        "accent_end_hex": "#B8891B",
        "background_start_hex": "#121212",
        "background_end_hex": "#2A2112",
        "text_hex": "#FFF8E7",
    },
    {
        "key": "birthday_bloom",
        "name": "Birthday Bloom",
        "description": "Soft celebratory card for birthdays and milestones.",
        "icon_key": "cake",
        "accent_start_hex": "#FFB7D5",
        "accent_end_hex": "#E35D9A",
        "background_start_hex": "#2B1321",
        "background_end_hex": "#5E2347",
        "text_hex": "#FFF7FB",
    },
    {
        "key": "self_care_glow",
        "name": "Self Care Glow",
        "description": "Warm spa-like palette for a relaxing treat.",
        "icon_key": "lotus",
        "accent_start_hex": "#FFD27F",
        "accent_end_hex": "#FF8A4C",
        "background_start_hex": "#26190F",
        "background_end_hex": "#5A3016",
        "text_hex": "#FFF9F1",
    },
    {
        "key": "celebration_confetti",
        "name": "Celebration Confetti",
        "description": "Bright festive card for special occasions.",
        "icon_key": "confetti",
        "accent_start_hex": "#8FE1FF",
        "accent_end_hex": "#6F74FF",
        "background_start_hex": "#10142B",
        "background_end_hex": "#20286C",
        "text_hex": "#F7FBFF",
    },
    {
        "key": "thank_you_blossom",
        "name": "Thank You Blossom",
        "description": "Elegant floral card for thoughtful gifting.",
        "icon_key": "flower",
        "accent_start_hex": "#F8C7A8",
        "accent_end_hex": "#D97A6A",
        "background_start_hex": "#291615",
        "background_end_hex": "#5E2B2A",
        "text_hex": "#FFF7F4",
    },
    {
        "key": "midnight_luxe",
        "name": "Midnight Luxe",
        "description": "Dark luxe card with jewel-toned highlights.",
        "icon_key": "gem",
        "accent_start_hex": "#8AD8C8",
        "accent_end_hex": "#3BA38C",
        "background_start_hex": "#0D1718",
        "background_end_hex": "#173239",
        "text_hex": "#F4FFFD",
    },
]

_TEMPLATE_MAP = {item["key"]: item for item in GIFT_CARD_TEMPLATES}


def list_gift_card_templates() -> list[dict[str, str]]:
    return [dict(item) for item in GIFT_CARD_TEMPLATES]


def normalize_gift_card_template_key(template_key: str | None) -> str:
    key = (template_key or "").strip()
    if not key:
        return DEFAULT_GIFT_CARD_TEMPLATE_KEY
    if key not in _TEMPLATE_MAP:
        raise ValueError("Invalid gift card template")
    return key


def get_gift_card_template(template_key: str | None) -> dict[str, str]:
    key = normalize_gift_card_template_key(template_key)
    return dict(_TEMPLATE_MAP[key])


def attach_gift_card_template(payload: dict[str, Any]) -> dict[str, Any]:
    template_key = normalize_gift_card_template_key(payload.get("template_key"))
    payload = dict(payload)
    payload["template_key"] = template_key
    payload["template"] = get_gift_card_template(template_key)
    return payload
