#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
PRIMARY_CERT_DOMAIN="${PRIMARY_CERT_DOMAIN:?PRIMARY_CERT_DOMAIN is required}"

SOURCE_DIR="/etc/letsencrypt/live/${PRIMARY_CERT_DOMAIN}"
TARGET_DIR="${APP_ROOT}/deploy/certs"

if [[ ! -f "${SOURCE_DIR}/fullchain.pem" || ! -f "${SOURCE_DIR}/privkey.pem" ]]; then
  echo "Missing certificate files in ${SOURCE_DIR}" >&2
  exit 1
fi

mkdir -p "${TARGET_DIR}"
install -m 0644 "${SOURCE_DIR}/fullchain.pem" "${TARGET_DIR}/fullchain.pem"
install -m 0600 "${SOURCE_DIR}/privkey.pem" "${TARGET_DIR}/privkey.pem"

echo "Synced certbot certificates to ${TARGET_DIR}"
