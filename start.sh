#!/usr/bin/env bash
# 24H Work Dashboard launcher (macOS / Linux)
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed — install the LTS version from https://nodejs.org and re-run."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "First run: installing dependencies (one time)..."
  npm install --no-audit --no-fund
fi

if [ ! -d .next ]; then
  echo "Building the app (one time)..."
  npm run build
fi

echo "Starting 24H Work Dashboard at http://localhost:3000 (Ctrl+C to stop)"
( sleep 2 && (open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null) ) &
npm run start