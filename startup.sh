#!/bin/sh
set -eu
APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$APP_DIR"
# :8081 is QA-only — a revive must never inherit a stale built-output preview.
if [ -d /proc ]; then
  node scripts/preview.mjs stop || true
fi
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
# The live-preview proxy discovers 0.0.0.0:8080 (AGENTS.md); `npm run dev` alone binds loopback.
EUGENE_DEV_HOST=0.0.0.0 npm run dev >>/tmp/app-startup.log 2>&1 &
