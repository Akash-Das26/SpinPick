#!/usr/bin/env bash
# SpinPick — OpenRouter proxy security-matrix smoke test (curl).
#
# Starts an isolated proxy instance with a STRICT test configuration, exercises
# the full security matrix (origin allow-list, PROXY_AUTH_TOKEN gate + RFC 7235
# WWW-Authenticate header, health, CORS preflight, rate limit), prints PASS/FAIL
# per check, and exits non-zero on any failure. Safe to run in CI or locally.
#
# Usage:  ./scripts/proxy-smoke.sh [PORT]     (default port 8790)
# Requires: bash, curl, node (proxy has no npm deps — Node built-ins only).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${1:-8790}"
BASE="http://127.0.0.1:${PORT}"
PASS=0
FAIL=0

check() { # name expected actual
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS + 1))
    printf '  \033[32mPASS\033[0m %-48s (got %s)\n' "$name" "$actual"
  else
    FAIL=$((FAIL + 1))
    printf '  \033[31mFAIL\033[0m %-48s (expected %s, got %s)\n' "$name" "$expected" "$actual"
  fi
}

# --- Start an isolated proxy with a strict test config --------------------
# ALLOWED_ORIGINS: only the two listed frontends; PROXY_AUTH_TOKEN configured so
# non-browser clients need the shared secret; NODE_ENV=production (strict).
(
  cd "$ROOT"
  ALLOWED_ORIGINS="https://spinpick.app,http://localhost:5173" \
  PROXY_AUTH_TOKEN="super-secret-token-42" \
  OPENROUTER_API_KEY="test-api-key-1234567890" \
  NODE_ENV="production" \
  PORT="$PORT" \
  node server/proxy.mjs
) >/tmp/spinpick-proxy-smoke.log 2>&1 &
PROXY_PID=$!
trap 'kill "$PROXY_PID" 2>/dev/null || true; wait "$PROXY_PID" 2>/dev/null || true' EXIT

# Wait for the server to answer /health (up to ~10s), then fail fast with logs
UP=0
for _ in $(seq 1 50); do
  if curl -sf -o /dev/null "${BASE}/health"; then UP=1; break; fi
  sleep 0.2
done
if [ "$UP" -ne 1 ]; then
  printf 'Proxy failed to start. Log:\n'
  cat /tmp/spinpick-proxy-smoke.log || true
  exit 1
fi

BODY='{"model":"m","messages":[]}' # empty messages → 400 once all gates pass
JSON_HEADER=(-H 'Content-Type: application/json')

printf '\n== 1) Health ==\n'
check 'GET /health → 200' 200 "$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/health")"

printf '\n== 2) CORS preflight ==\n'
check 'OPTIONS allowed origin → 204' 204 \
  "$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS -H 'Origin: https://spinpick.app' -H 'Access-Control-Request-Method: POST' "${BASE}/api/openrouter")"

printf '\n== 3) Origin allow-list ==\n'
check 'POST evil origin → 403' 403 \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Origin: https://evil.example.com' "${JSON_HEADER[@]}" -d "$BODY" "${BASE}/api/openrouter")"
check 'POST allowed origin → 400 (gate passed)' 400 \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Origin: https://spinpick.app' "${JSON_HEADER[@]}" -d "$BODY" "${BASE}/api/openrouter")"

printf '\n== 4) PROXY_AUTH_TOKEN gate ==\n'
check 'no-Origin, no token → 401' 401 \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST "${JSON_HEADER[@]}" -d "$BODY" "${BASE}/api/openrouter")"
check 'no-Origin, wrong token → 401' 401 \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Authorization: Bearer wrong-token' "${JSON_HEADER[@]}" -d "$BODY" "${BASE}/api/openrouter")"
check 'no-Origin, correct token → 400 (gate passed)' 400 \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Authorization: Bearer super-secret-token-42' "${JSON_HEADER[@]}" -d "$BODY" "${BASE}/api/openrouter")"

# RFC 7235 — the 401 must advertise the auth scheme so clients know how to retry
WWW=$(curl -s -D - -o /dev/null -X POST "${JSON_HEADER[@]}" -d "$BODY" "${BASE}/api/openrouter" \
  | tr -d '\r' | grep -i '^www-authenticate:' | awk '{print $2}' || true)
check '401 includes WWW-Authenticate: Bearer' 'Bearer' "$WWW"

printf '\n== 5) Browser exemption ==\n'
check 'browser (allowed origin), no token → 400, not 401' 400 \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Origin: https://spinpick.app' "${JSON_HEADER[@]}" -d "$BODY" "${BASE}/api/openrouter")"

printf '\n== 6) Rate limit (60/min per IP) ==\n'
code=''
for _ in $(seq 1 70); do
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Origin: https://spinpick.app' "${JSON_HEADER[@]}" -d "$BODY" "${BASE}/api/openrouter")
  [ "$code" = "429" ] && break
done
check '61st request from same IP → 429' 429 "$code"

printf '\nResult: %d passed, %d failed\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] || exit 1
