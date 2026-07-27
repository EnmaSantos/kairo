#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PID=""
LOCAL_AI_PID=""
API_PORT="${KAIRO_API_PORT:-8000}"
LOCAL_AI_PORT="${KAIRO_LOCAL_AI_PORT:-8001}"
UI_PORT="${KAIRO_UI_PORT:-3000}"

cleanup() {
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "$LOCAL_AI_PID" ]] && kill -0 "$LOCAL_AI_PID" 2>/dev/null; then
    kill "$LOCAL_AI_PID" 2>/dev/null || true
    wait "$LOCAL_AI_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT

create_env_from_example() {
  local example_path="$1"
  local env_path="$2"

  if [[ ! -f "$env_path" ]]; then
    cp "$example_path" "$env_path"
    echo "Created $env_path from its example file."
  fi
}

require_available_port() {
  local port="$1"
  local service="$2"
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "$service cannot start because port $port is already in use."
    echo "Stop the existing process or set a different KAIRO_*_PORT value."
    exit 1
  fi
}

if [[ -x "$PROJECT_DIR/.venv/bin/python" ]]; then
  PYTHON_ENV="$PROJECT_DIR/.venv"
elif [[ -x "$PROJECT_DIR/kairo-env/bin/python" ]]; then
  PYTHON_ENV="$PROJECT_DIR/kairo-env"
else
  echo "Kairo's Python environment was not found. Run:"
  echo "  uv venv --python 3.13 .venv"
  echo "  uv pip install --python .venv/bin/python -r requirements-ai.txt"
  exit 1
fi

if [[ ! -d "$PROJECT_DIR/kairo-frontend/node_modules" ]]; then
  echo "Frontend dependencies are missing. Run:"
  echo "  cd $PROJECT_DIR/kairo-frontend && npm ci"
  exit 1
fi

create_env_from_example "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
create_env_from_example "$PROJECT_DIR/kairo-frontend/.env.example" "$PROJECT_DIR/kairo-frontend/.env"

require_available_port "$API_PORT" "Kairo API"
require_available_port "$LOCAL_AI_PORT" "Kairo Local AI"
require_available_port "$UI_PORT" "Kairo UI"

cd "$PROJECT_DIR"
source "$PYTHON_ENV/bin/activate"

# The token exists only for this launcher session and is inherited by the
# loopback API and Vite. It is never written into the hosted frontend build.
KAIRO_LOCAL_AI_TOKEN="$(openssl rand -hex 32)"
export KAIRO_LOCAL_AI_TOKEN
export VITE_LOCAL_AI_TOKEN="$KAIRO_LOCAL_AI_TOKEN"
export VITE_AI_MODE="local"
export VITE_API_URL="http://127.0.0.1:$API_PORT"
export VITE_LOCAL_AI_URL="http://127.0.0.1:$LOCAL_AI_PORT"

LOCAL_UI_ORIGINS="http://127.0.0.1:$UI_PORT,http://localhost:$UI_PORT"
export CORS_ALLOWED_ORIGINS="${CORS_ALLOWED_ORIGINS:+$CORS_ALLOWED_ORIGINS,}$LOCAL_UI_ORIGINS"
export KAIRO_LOCAL_CORS_ORIGINS="${KAIRO_LOCAL_CORS_ORIGINS:+$KAIRO_LOCAL_CORS_ORIGINS,}$LOCAL_UI_ORIGINS"

echo "Starting Kairo cloud-safe API at http://127.0.0.1:$API_PORT"
uvicorn main:app --host 127.0.0.1 --port "$API_PORT" &
BACKEND_PID=$!

echo "Starting Kairo Local AI at http://127.0.0.1:$LOCAL_AI_PORT"
uvicorn local_ai:app --host 127.0.0.1 --port "$LOCAL_AI_PORT" &
LOCAL_AI_PID=$!

cd "$PROJECT_DIR/kairo-frontend"
echo "Starting Kairo UI at http://localhost:$UI_PORT"
echo "Press Ctrl+C to stop Kairo."
npm run dev -- --host 127.0.0.1 --port "$UI_PORT" --strictPort
