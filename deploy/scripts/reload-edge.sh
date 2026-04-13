#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"

cd "${APP_ROOT}"
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T nginx nginx -s reload
