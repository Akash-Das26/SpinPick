# ============================================================================
# SpinPick — OpenRouter Proxy (zero-dependency)
# ----------------------------------------------------------------------------
# The proxy (server/proxy.mjs) uses only Node built-ins (>= 18), so this image
# is intentionally tiny: no npm install, no node_modules, just the server file
# running as a non-root user.
#
# Build & run:
#   docker build -t spinpick-proxy .
#   docker run --rm -p 8787:8787 \
#     -e OPENROUTER_API_KEY=sk-or-v1-... \
#     -e ALLOWED_ORIGINS=https://spinpick.app \
#     spinpick-proxy
#
# Or with docker compose (recommended — see docker-compose.yml):
#   OPENROUTER_API_KEY=sk-or-v1-... docker compose up -d --build
# ============================================================================

FROM node:22-alpine

# Only the server file is needed — keep the image minimal.
WORKDIR /app
COPY server/proxy.mjs server/proxy.mjs

# Run as an unprivileged user (never root).
RUN addgroup -S spinpick && adduser -S spinpick -G spinpick
USER spinpick

ENV NODE_ENV=production
ENV PORT=8787

EXPOSE 8787

# Lightweight healthcheck: GET /health returns 200 when the server is alive.
# The response body includes "keyConfigured" so operators can see at a glance
# whether OPENROUTER_API_KEY is set — a healthy-but-keyless container reports
# unhealthy for key configuration at the orchestration layer, not here.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8787) + '/health').then((r) => { if (r.ok) process.exit(0); console.error('unexpected status', r.status); process.exit(1); }).catch((e) => { console.error(e.message); process.exit(1); })"

CMD ["node", "server/proxy.mjs"]
