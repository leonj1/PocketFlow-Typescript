# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Base image (shared by all stages)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ---------------------------------------------------------------------------
# Dependencies
#
# The repo is a two-package monorepo:
#   - the root "pocketflow" library (built with tsup -> dist/)
#   - apps/agent-chat (Next.js) which depends on it via "file:../.."
# ---------------------------------------------------------------------------
FROM base AS deps

# Native build toolchain: better-sqlite3 ships prebuilt binaries but npm still
# runs `node-gyp rebuild` for it during `npm install`, which needs these.
RUN apk add --no-cache python3 make g++

# Root library: manifests + the source needed to build it
COPY package.json package-lock.json ./
COPY tsconfig.json tsup.config.ts ./
COPY src ./src

RUN npm ci --no-audit --no-fund
RUN npm run build

# App: manifests only. The app pins several dependencies to "latest", which
# keeps its lockfile from satisfying `npm ci`, so `npm install` is required.
COPY apps/agent-chat/package.json apps/agent-chat/package-lock.json apps/agent-chat/
RUN cd apps/agent-chat && npm install --no-audit --no-fund

# ---------------------------------------------------------------------------
# Builder: produce the Next.js standalone output (.next/standalone)
# ---------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app /app
COPY . .
RUN cd apps/agent-chat && npm run build

# ---------------------------------------------------------------------------
# Runner: minimal production image from the standalone output
# ---------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/data/agent-chat.db

# Run as an unprivileged user and give it a writable, persistent SQLite dir.
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs \
    && mkdir -p /data \
    && chown nextjs:nodejs /data

# The standalone tree keeps the monorepo layout: entry point is
# apps/agent-chat/server.js (it chdir()s into its own directory on start).
COPY --from=builder /app/apps/agent-chat/.next/standalone ./
COPY --from=builder /app/apps/agent-chat/.next/static ./apps/agent-chat/.next/static

USER nextjs
EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "apps/agent-chat/server.js"]
