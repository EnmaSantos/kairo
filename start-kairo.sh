#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PID=""

cleanup() {
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
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

if [[ ! -x "$PROJECT_DIR/kairo-env/bin/python" ]]; then
  echo "Kairo's Python environment was not found at $PROJECT_DIR/kairo-env"
  exit 1
fi

if [[ ! -d "$PROJECT_DIR/kairo-frontend/node_modules" ]]; then
  echo "Frontend dependencies are missing. Run:"
  echo "  cd $PROJECT_DIR/kairo-frontend && npm ci"
  exit 1
fi

create_env_from_example "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
create_env_from_example "$PROJECT_DIR/kairo-frontend/.env.example" "$PROJECT_DIR/kairo-frontend/.env"

cd "$PROJECT_DIR"
source "$PROJECT_DIR/kairo-env/bin/activate"

echo "Starting Kairo API at http://127.0.0.1:8000"
uvicorn main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

cd "$PROJECT_DIR/kairo-frontend"
echo "Starting Kairo UI at http://localhost:3000"
echo "Press Ctrl+C to stop Kairo."
npm run dev
