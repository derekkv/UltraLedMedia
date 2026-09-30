FROM node:22-alpine AS base
RUN npm install -g pnpm@latest-10

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/shared/package.json              ./packages/shared/package.json
COPY apps/api/package.json                     ./apps/api/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

# ── prisma generate ───────────────────────────────────────────────────────────
FROM deps AS builder
COPY packages/shared ./packages/shared
COPY apps/api        ./apps/api
WORKDIR /app/apps/api
RUN pnpm db:generate

# ── runner ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN npm install -g pnpm@latest-10
WORKDIR /app

COPY --from=builder /app/node_modules                   ./node_modules
COPY --from=builder /app/packages                       ./packages
COPY --from=builder /app/apps/api                       ./apps/api
COPY --from=builder /app/package.json                   ./package.json
COPY --from=builder /app/pnpm-workspace.yaml            ./pnpm-workspace.yaml
COPY --from=builder /app/tsconfig.base.json             ./tsconfig.base.json

WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 3000

CMD ["pnpm", "start"]
