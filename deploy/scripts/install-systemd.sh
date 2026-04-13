#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${1:-$(cd "$(dirname "$0")/../.." && pwd)}"
SYSTEMD_DIR="/etc/systemd/system"
ENV_DIR="/etc/nailsdash"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo $0 ${APP_ROOT}" >&2
  exit 1
fi

mkdir -p "${ENV_DIR}"

install -m 0644 "${APP_ROOT}/deploy/systemd/nailsdash-compose.service" "${SYSTEMD_DIR}/nailsdash-compose.service"
install -m 0644 "${APP_ROOT}/deploy/systemd/nailsdash-certbot-renew.service" "${SYSTEMD_DIR}/nailsdash-certbot-renew.service"
install -m 0644 "${APP_ROOT}/deploy/systemd/nailsdash-certbot-renew.timer" "${SYSTEMD_DIR}/nailsdash-certbot-renew.timer"

if [[ ! -f "${ENV_DIR}/nailsdash.env" ]]; then
  install -m 0644 "${APP_ROOT}/deploy/systemd/nailsdash.env.example" "${ENV_DIR}/nailsdash.env"
fi

sed -i.bak "s|^APP_ROOT=.*|APP_ROOT=${APP_ROOT}|" "${ENV_DIR}/nailsdash.env"

systemctl daemon-reload

echo "Installed systemd units."
echo "Next steps:"
echo "1. Edit ${ENV_DIR}/nailsdash.env"
echo "2. Create ${APP_ROOT}/.env.prod and ${APP_ROOT}/backend/.env.prod"
echo "3. systemctl enable --now nailsdash-compose.service"
echo "4. ${APP_ROOT}/deploy/scripts/bootstrap-letsencrypt.sh"
echo "5. systemctl enable --now nailsdash-certbot-renew.timer"
