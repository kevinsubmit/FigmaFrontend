"""
Environment-driven web server runner.
"""
from __future__ import annotations

import uvicorn

from app.core.config import settings


def main() -> None:
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=int(settings.PORT),
        workers=max(1, int(settings.WEB_CONCURRENCY)),
        timeout_keep_alive=max(1, int(settings.WEB_TIMEOUT_KEEP_ALIVE_SECONDS)),
        backlog=max(32, int(settings.WEB_BACKLOG)),
        limit_concurrency=(None if int(settings.WEB_LIMIT_CONCURRENCY) <= 0 else int(settings.WEB_LIMIT_CONCURRENCY)),
        proxy_headers=bool(settings.WEB_PROXY_HEADERS),
        forwarded_allow_ips=settings.WEB_FORWARDED_ALLOW_IPS,
        log_level=settings.web_log_level,
    )


if __name__ == "__main__":
    main()
