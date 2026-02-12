#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.run"
BACKEND_DIR="$ROOT_DIR/backend"
ADMIN_DIR="$ROOT_DIR/admin-dashboard"
FRONTEND_DIR="$ROOT_DIR/frontend"

BACKEND_PORT="${BACKEND_PORT:-8000}"
ADMIN_PORT="${ADMIN_PORT:-3100}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

START_BACKEND=1
START_ADMIN=1
START_FRONTEND=1

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --no-backend     Do not start backend
  --no-admin       Do not start admin-dashboard
  --no-h5          Do not start frontend (H5)
  --only-backend   Start backend only
  --only-admin     Start admin-dashboard only
  --only-h5        Start frontend (H5) only
  -h, --help       Show this help

Env overrides:
  BACKEND_PORT (default: 8000)
  ADMIN_PORT (default: 3100)
  FRONTEND_PORT (default: 5173)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-backend) START_BACKEND=0 ;;
    --no-admin) START_ADMIN=0 ;;
    --no-h5) START_FRONTEND=0 ;;
    --only-backend) START_BACKEND=1; START_ADMIN=0; START_FRONTEND=0 ;;
    --only-admin) START_BACKEND=0; START_ADMIN=1; START_FRONTEND=0 ;;
    --only-h5) START_BACKEND=0; START_ADMIN=0; START_FRONTEND=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1"; usage; exit 1 ;;
  esac
  shift
done

mkdir -p "$RUN_DIR"

log() {
  printf '[restart_dev] %s\n' "$*"
}

stop_pid_file() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      sleep 0.5
      if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
      fi
    fi
    rm -f "$pid_file"
  fi
}

# Stop known old processes and stale pid-file processes
log "Stopping old dev processes..."
stop_pid_file "$RUN_DIR/backend.pid"
stop_pid_file "$RUN_DIR/admin.pid"
stop_pid_file "$RUN_DIR/frontend.pid"

pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "vite --host 0.0.0.0 --port ${ADMIN_PORT}" 2>/dev/null || true
pkill -f "vite --host 0.0.0.0 --port ${FRONTEND_PORT}" 2>/dev/null || true
pkill -f "node .*vite" 2>/dev/null || true

if [[ "$START_BACKEND" -eq 1 ]]; then
  log "Running backend migration..."
  (
    cd "$BACKEND_DIR"
    source venv/bin/activate
    alembic upgrade head
  )

  log "Starting backend on :$BACKEND_PORT"
  (
    cd "$BACKEND_DIR"
    source venv/bin/activate
    nohup uvicorn app.main:app --reload --host 0.0.0.0 --port "$BACKEND_PORT" > "$RUN_DIR/backend.log" 2>&1 &
    echo $! > "$RUN_DIR/backend.pid"
  )
fi

if [[ "$START_ADMIN" -eq 1 ]]; then
  log "Starting admin-dashboard on :$ADMIN_PORT"
  (
    cd "$ADMIN_DIR"
    nohup npm run dev -- --host 0.0.0.0 --port "$ADMIN_PORT" --strictPort > "$RUN_DIR/admin.log" 2>&1 &
    echo $! > "$RUN_DIR/admin.pid"
  )
fi

if [[ "$START_FRONTEND" -eq 1 ]]; then
  log "Starting frontend (H5) on :$FRONTEND_PORT"
  (
    cd "$FRONTEND_DIR"
    nohup npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT" --strictPort > "$RUN_DIR/frontend.log" 2>&1 &
    echo $! > "$RUN_DIR/frontend.pid"
  )
fi

sleep 1
log "Done."
[[ -f "$RUN_DIR/backend.pid" ]] && log "Backend PID: $(cat "$RUN_DIR/backend.pid") | Log: $RUN_DIR/backend.log"
[[ -f "$RUN_DIR/admin.pid" ]] && log "Admin PID:   $(cat "$RUN_DIR/admin.pid") | Log: $RUN_DIR/admin.log"
[[ -f "$RUN_DIR/frontend.pid" ]] && log "H5 PID:      $(cat "$RUN_DIR/frontend.pid") | Log: $RUN_DIR/frontend.log"
