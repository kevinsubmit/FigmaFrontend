#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"

if [[ ! -f "${APP_ROOT}/.env.prod" ]]; then
  echo "Missing ${APP_ROOT}/.env.prod" >&2
  exit 1
fi

# shellcheck disable=SC1091
source "${APP_ROOT}/.env.prod"

APP_DOMAIN="${APP_DOMAIN:?APP_DOMAIN is required in .env.prod}"
ADMIN_DOMAIN="${ADMIN_DOMAIN:?ADMIN_DOMAIN is required in .env.prod}"
API_DOMAIN="${API_DOMAIN:?API_DOMAIN is required in .env.prod}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:?LETSENCRYPT_EMAIL is required in .env.prod}"
PRIMARY_CERT_DOMAIN="${PRIMARY_CERT_DOMAIN:-${API_DOMAIN}}"

cd "${APP_ROOT}"

if docker compose --env-file .env.prod -f docker-compose.prod.yml ps nginx >/dev/null 2>&1; then
  docker compose --env-file .env.prod -f docker-compose.prod.yml stop nginx || true
fi

certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email "${LETSENCRYPT_EMAIL}" \
  -d "${APP_DOMAIN}" \
  -d "${ADMIN_DOMAIN}" \
  -d "${API_DOMAIN}"

APP_ROOT="${APP_ROOT}" PRIMARY_CERT_DOMAIN="${PRIMARY_CERT_DOMAIN}" "${APP_ROOT}/deploy/scripts/sync-certbot-certs.sh"

docker compose --env-file .env.prod -f docker-compose.prod.yml up -d nginx

echo "Initial Let's Encrypt certificate issued for ${APP_DOMAIN}, ${ADMIN_DOMAIN}, ${API_DOMAIN}"
