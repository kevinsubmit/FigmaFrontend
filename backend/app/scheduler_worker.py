"""
Standalone scheduler worker entrypoint.
"""
from __future__ import annotations

import asyncio
import logging
import signal

from app.core.config import settings
from app.services.scheduler import reminder_scheduler
from app.services import notification_service

logger = logging.getLogger(__name__)


async def _run_worker() -> None:
    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()

    def _request_stop() -> None:
        stop_event.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, _request_stop)
        except NotImplementedError:
            # Fallback for platforms without loop signal handlers.
            signal.signal(sig, lambda *_args: loop.call_soon_threadsafe(stop_event.set))

    logger.info(
        "Scheduler worker starting (embedded_scheduler_enabled=%s)",
        settings.embedded_scheduler_enabled,
    )
    notification_service.start_async_push_dispatcher()
    reminder_scheduler.start()

    try:
        await stop_event.wait()
    finally:
        await reminder_scheduler.stop()
        notification_service.shutdown_async_push_dispatcher(timeout_seconds=5.0)
        logger.info("Scheduler worker stopped")


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    asyncio.run(_run_worker())


if __name__ == "__main__":
    main()
